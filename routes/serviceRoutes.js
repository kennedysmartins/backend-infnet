const express = require('express')
const serviceController = require('../services/metadataService')


const router = express.Router()


router.post('/extractor', (request, response) => {
    const url = request.body.url
    serviceController.extractMetadata(url)
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