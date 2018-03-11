const express = require('express')
const morgan = require('morgan')
const mongo = require('mongodb').MongoClient
const {promisify} = require('util')

const app = express()

function toCallback (asyncMiddleware) {
  return function (req, res, next) {
    asyncMiddleware(req, res, next).catch(err => next(err))
  }
}

async function connect () {
  return mongo.connect(process.env.MONGO_URL || 'mongodb://localhost:27017')
}

app.use(morgan('dev'))
app.use(express.json())

app.post('/login', toCallback(async (req, res) => {
  const conn = await connect()
  const users = conn.db('myapp').collection('users')

  const user = await users.findOne({
    username: req.body.username,
    password: req.body.password
  })

  if (user) {
    res.status(200).send(`Welcome ${user.username}!`).end()
  } else {
    res.status(401).send('Nope!').end()
  }

  conn.close()
}))

app.get('/secrets', toCallback(async (req, res) => {
  if (!req.query.key) {
    res.status(400).send('Please specify a key').end()
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
    {content: 'secret1', key: 'niCWGLNWd6jFQAk2dFvP'},
    {content: 'secret2', key: 'BOARSGIKodcLV4nbOb8d'},
    {content: 'secret3', key: 'fv5r1lbgSIiDvuMI3Ght'}
  ])

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
