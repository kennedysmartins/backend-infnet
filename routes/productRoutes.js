const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')

router.get('/', (request, response) => {
    productController.getProducts()
    .then(data => response.json(data))
})

router.post('/:productId/add-to-group/:groupId', (request, response) => {
    const productId = request.params.productId;
    const groupId = request.params.groupId;

    productController.addProductToGroup(productId, groupId)
        .then(data => {
            if (data) {
                response.status(200).json(data);
            } else {
                response.status(404).send();
            }
        })
        .catch(error => {
            response.status(500).json({ error: error.message });
        });
});

router.post('/create-group', (request, response) => {
    const { productIds, ...groupData } = request.body;
    console.log("Criando um grupo de produtos", productIds, groupData)

  
    productController.createProductGroup(groupData, productIds)
      .then(data => {
        response.status(201).json(data);
      })
      .catch(error => {
        response.status(500).json({ error: error.message });
      });
  });

router.get('/productGroups', async (request, response) => {
    try {
        const productGroups = await productController.getProductGroups();
        response.status(200).json(productGroups);
    } catch (error) {
        response.status(500).json({ error: "Erro ao buscar grupos de produtos: " + error.message });
    }
});

router.get('/productGroups/:groupId/products', async (request, response) => {
    try {
      const { groupId } = request.params;
      const productsInGroup = await productController.getProductsByGroup(groupId);
      response.status(200).json(productsInGroup);
    } catch (error) {
      response.status(500).json({ error: error.message });
    }
  });

router.get("/paginated", (request, response) => {
    const page = parseInt(request.query.page) || 1
    const pageSize = parseInt(request.query.pageSize) || 20
    productController.getProductsPaginated(page, pageSize)
    .then(data => response.json(data))
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
    const amazon = request.body.amazon
    const magazine = request.body.magazine
    productController.extractMetadata(url)
    .then(product => {
        if(product) {
            response.status(200).json(product)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota extractMetadata')
})

router.post('/extractor2', (request, response) => {
    const url = request.body.url
    const amazon = request.body.amazon
    const magazine = request.body.magazine
    productController.extractMetadata2(url, amazon, magazine)
    .then(product => {
        if(product) {
            response.status(200).json(product)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota extractMetadata')
})

router.post('/extractorAmazon', (request, response) => {
    const {url, amazon, accesskey, secretkey, asin} = request.body
    productController.extractAmazonAPI(accesskey, secretkey, amazon, asin)
    .then(product => {
        if(product) {
            response.status(200).json(product)
        } else {
            response.status(404).send()

        }
    })
    console.log('Rota extractMetadata')
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



router.patch('/:id/click', (request,response) => {
    const productId = request.params.id;
    console.log("Adicionando click ao produto com ID", productId)
    productController.updateProductClick(productId)
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
