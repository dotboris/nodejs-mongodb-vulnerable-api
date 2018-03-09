const express = require('express')

const app = express();

app.get('/', (req, res, next) => {
  res.send('Hello world!').end()
})

app.get('/errorme', (req, res, next) => {
  next(new Error('test'))
})

app.listen(parseInt(process.env.PORT || 3000))
