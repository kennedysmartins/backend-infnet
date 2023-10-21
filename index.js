const express = require('express')
const categoryRoutes = require('./routes/categoryRoutes')
const productRoutes = require('./routes/productRoutes')
const cors = require('cors')
const redirectMiddleware = require('./middlewares/redirectMiddleware')
const logMiddleware = require('./middlewares/logMiddleware')
const rateLimit = require('./middlewares/rateLimit')


const app = express();
const port = 4000;

app.use(express.json());
app.use(cors())
app.use(redirectMiddleware)
app.use(logMiddleware)
app.use(rateLimit)

app.get('/', (request, response) => {
    response.send("Hello World")
})

app.use('/categories', categoryRoutes )
app.use('/products', productRoutes)

app.listen(port, () =>{
    console.log('Servidor rodando em http://localhost:'+ port)
})