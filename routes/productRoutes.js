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

router.put('/:id', (request, response) => {
    const productId = request.params.id 
    const updateData = request.body;

    productController.updateProduct(productId, updateData)
    .then(data => {
        if(data) {
            response.status(200).json(data)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota updateProduct')
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
    .catch((error) => {
        response.status(404).json(error.message)
    })

})

router.post('/', (request, response) => {
    const newProductData = request.body
    productController.addProduct(newProductData)
    .then(product => {
        if(product) {
            response.status(201).json(product)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota addProduct')
})

router.post('/extractor', (request, response) => {
    const url = request.body.url
    productController.extractMetadata(url)
    .then(product => {
        if(product) {
            response.status(201).json(product)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota addProduct')
})

router.delete('/:id', (request, response) => {
    const idRecebido = request.params.id;
    productController.deleteProducts(idRecebido)
    .then(data => {
        if(data) {
            response.status(200).json(data)
        }
    })
    .catch((error) => {
        response.status(404).json(error.message)
    })
})

router.patch('/:id/:percent/discount', (request, response) => {
    const productId = request.params.id;
    const productDiscount = request.params.percent;
    productController.applyDiscount(productId,productDiscount)
    .then(data => {
        if(data) {
            response.status(200).json(data)
        }
    })
    .catch((error) => {
        response.status(404).json(error.message)
    })
})

router.patch('/:id/rating', (request,response) => {
    const productId = request.params.id;
    const rating = request.body.rating
    productController.updateProductRating(productId,rating)
    .then(data => {
        if(data) {
            response.status(200).json(data)
        }
    })
    .catch((error) => {
        response.status(404).json(error.message)
    })
})

module.exports = router;
