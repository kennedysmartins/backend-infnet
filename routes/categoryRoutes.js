const express = require('express')
const categoryController = require('../controllers/categoryController')


const router = express.Router()

router.get('/', (request, response) => {
    categoryController.getCategories()
    .then(data => response.json(data))
    console.log('Rota categories')
})

router.post('/', (request, response) => {
    categoryController.createCategories(request.body)
    .then(() => response.status(201).send("Categoria criada com sucesso"))
    .catch((error) => response.status(500).send(error.message))
    console.log(request.body);
})


module.exports = router;