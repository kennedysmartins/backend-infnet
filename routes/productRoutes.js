const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')

router.get('/', (request, response) => {
    productController.getProducts()
    .then(data => response.json(data))
    console.log('Rota Products')
})

router.get('/:id', (request, response) => {
    const IdRecebido = request.params.id;
    productController.getProductById(IdRecebido)
    .then(data => {
        if(data) {
            response.status(200).json(data)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota ProductsID')
})

router.get('/search/:name', (request, response) => {
    const productName = request.params.name;
    productController.getProductByName(productName)
    .then(data => {
        if(data && data.length > 0) {
            response.status(200).json(data)
        } else {
            response.status(404).send()

        }
    })

})

router.post('/', (request, response) => {
})

module.exports = router;
