const express = require('express')
const morgan = require('morgan')
const loremIpsum = require('lorem-ipsum')
const mongo = require('mongodb').MongoClient
const {promisify} = require('util')
const crypto = require('crypto')
const randomBytes = promisify(crypto.randomBytes)

const app = express()

function toCallback (asyncMiddleware) {
  return function (req, res, next) {
    asyncMiddleware(req, res, next).catch(err => next(err))
  }
}

async function connect () {
  return mongo.connect(process.env.MONGO_URL || 'mongodb://localhost:27017')
}

async function randomToken (size = 256) {
  const bytes = await randomBytes(size)
  return bytes.toString('hex')
}

app.use(morgan('dev'))
app.use(express.json())

app.get('/posts', toCallback(async (req, res) => {
  const conn = await connect()
  const postsCollection = conn.db('myapp').collection('posts')

  const posts = await postsCollection.find()
  res.json(await posts.toArray())

  conn.close()
}))

app.post('/login', toCallback(async (req, res) => {
  const conn = await connect()
  const users = conn.db('myapp').collection('users')

  const user = await users.findOne({
    username: req.body.username,
    password: req.body.password
  })

  if (user) {
    res.status(201).json({
      sessionId: await randomToken(),
      username: user.username
    })
  } else {
    res.status(401).end()
  }

  conn.close()
}))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send(err.stack)
})

app.get('/secrets', toCallback(async (req, res) => {
  if (!req.query.key) {
    res.status(400).json({
      error: 'Please specify a `key`'
    })
    return
  }

  const conn = await connect()
  const secrets = conn.db('myapp').collection('secrets')

  const secret = await secrets.findOne({key: req.query.key})
  if (secret) {
    res.json(secret)
  } else {
    res.status(404).end()
  }

  conn.close()
}))

async function start (port) {
  const conn = await connect()
  const db = conn.db('myapp')

  const users = db.collection('users')
  await users.deleteMany()
  await users.insertMany([
    {username: 'bob', password: 'P@ssw0rd1'},
    {username: 'alice', password: 'iheartcats'},
    {username: 'admin', password: 'supersecure'}
  ])

  const secrets = db.collection('secrets')
  await secrets.deleteMany()
  await secrets.insertMany([
    {content: 'secret1', key: await randomToken()},
    {content: 'secret2', key: await randomToken()},
    {content: 'secret3', key: await randomToken()}
  ])

  const posts = db.collection('posts')
  await posts.deleteMany()
  await posts.insertMany(Array.from(Array(10)).map(() => ({
    title: loremIpsum({units: 'sentences', count: 1}),
    content: loremIpsum({units: 'paragraphs', count: 5})
  })))

  conn.close()

  // start the webserver. Don't mind the promise magic
  await promisify(app.listen.bind(app))(port)

  console.log('App is up and running :)')
}

start(parseInt(process.env.PORT || 3000))
  .catch(err => {
    console.error('Setup failed :(')
    console.error(err.stack)
    process.exit(1)
  })
