const express = require('express')
const categoryRoutes = require('./routes/categoryRoutes')
const productRoutes = require('./routes/productRoutes')
const cors = require('cors')


const app = express();
const port = 4000;

app.use(express.json());
app.use(cors())

app.get('/', (request, response) => {
    response.send("Hello World")
})

app.use('/categories', categoryRoutes )
app.use('/products', productRoutes)

app.listen(port, () =>{
    console.log('Servidor rodando em http://localhost:'+ port)
})