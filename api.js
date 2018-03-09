const express = require('express')
const morgan = require('morgan')
const mongo = require('mongodb').MongoClient

const app = express()

function toCallback (asyncMiddleware) {
  return function (req, res, next) {
    asyncMiddleware(req, res, next).catch(err => next(err))
  }
}

app.use(morgan('tiny'))
app.use(express.json())

app.post('/login', toCallback(async (req, res, next) => {
  const conn = await mongo.connect(process.env.MONGO_URL || 'mongodb://localhost:27017')
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

// prepopulate db
;(async () => {
  const conn = await mongo.connect(process.env.MONGO_URL || 'mongodb://localhost:27017')
  const db = conn.db('myapp')

  const users = db.collection('users')
  await users.deleteMany()
  await users.insertMany([
    {username: 'bob', password: 'P@ssw0rd1'},
    {username: 'alice', password: 'iheartcats'},
    {username: 'admin', password: 'supersecure'}
  ])

  conn.close()
})().catch(err => {
  console.error('Failed to prepopulate database')
  console.error(err.stack)
  process.exit(1)
})

app.listen(parseInt(process.env.PORT || 3000))
