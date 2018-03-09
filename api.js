const express = require('express')
const morgan = require('morgan')

const app = express()

app.use(morgan('tiny'))

app.get('/', (req, res, next) => {
  res.send('Hello world!').end()
})

app.get('/errorme', (req, res, next) => {
  next(new Error('test'))
})

app.listen(parseInt(process.env.PORT || 3000))
