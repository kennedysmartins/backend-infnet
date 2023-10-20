const fs = require('fs').promises
const path = require('path')

const productsFilePath = path.join(__dirname, '../data/products.json')

const getProducts = async () => {
    try {
        const data = await fs.readFile(productsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(error.message);
    }  
}

const getProductById = (productId) => {
    return getProducts()
    .then((allProducts) => allProducts.find(product => product.id === parseInt(productId)))
    .catch((error) => {
        throw new Error(error.message).status(500)
    })

}

const getProductByName = (productName) => {
    return getProducts()
    .then((allProducts) => {
        const filteredProducts = allProducts.filter((product) => {
            return product.title.toLowerCase().includes(productName.toLowerCase())
        })
        return filteredProducts
    } )
    .catch((error) => {
        throw new Error(error.message)
    })

}

module.exports = {
    getProducts,
    getProductById,
    getProductByName}