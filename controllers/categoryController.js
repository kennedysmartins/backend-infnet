const fs = require('fs').promises
const path = require('path')

const categoriesFilePath = path.join(__dirname, '../data/categories.json')

const getCategories = async () => {
    try {
        const data = await fs.readFile(categoriesFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(error.message);
    }  
}

const createCategories = (category) => {
    return getCategories()
    .then((categoriesData) => {
        categoriesData.push({name:category.name})
        return fs.writeFile(categoriesFilePath, JSON.stringify(categoriesData))
    })
    .catch((err) => {
        throw new Error(err.message)
    })
}

module.exports = {
    getCategories,
    createCategories
}