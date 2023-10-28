const fs = require("fs").promises;
const { getRandomValues } = require("crypto");
const path = require("path");

const productsFilePath = path.join(__dirname, "../data/products.json");

const getProducts = async () => {
  try {
    const data = await fs.readFile(productsFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    throw new Error(error.message);
  }
};

const getProductById = (productId) => {
  return getProducts()
    .then((allProducts) =>
      allProducts.find((product) => product.id === parseInt(productId))
    )
    .catch((error) => {
      throw new Error(error.message).status(500);
    });
};

const getProductByName = (productName) => {
  return getProducts()
    .then((allProducts) => {
      const filteredProducts = allProducts.filter((product) => {
        return product.title.toLowerCase().includes(productName.toLowerCase());
      });
      return filteredProducts;
    })
    .catch((error) => {
      throw new Error(error.message);
    });
};

const updateProduct = (productId, updateData) => {
  return getProducts()
    .then((productsData) => {
      const productIndex = productsData.findIndex(
        (product) => product.id === parseInt(productId)
      );

      if (productIndex !== -1) {
        const existingProduct = productsData[productIndex];

        if (updateData.title) {
          existingProduct.title = updateData.title;
        }
        if (updateData.price) {
          existingProduct.price = updateData.price;
        }
        if (updateData.description) {
          existingProduct.description = updateData.description;
        }

        productsData[productIndex] = existingProduct;

        return fs
          .writeFile(
            productsFilePath,
            JSON.stringify(productsData, null, 2),
            "utf-8"
          )
          .then(() => {
            return existingProduct;
          })
          .catch((error) => {
            throw new Error("Erro ao atualizar o produto: " + error.message);
          });
      } else {
        throw new Error("Produto não encontrado");
      }
    })
    .catch((error) => {
      throw new Error("Erro ao buscar produtos: " + error.message);
    });
};

const deleteProducts = (productId) => {
  return getProducts()
    .then((productsData) => {
      const productIndex = productsData.findIndex(
        (product) => product.id === parseInt(productId)
      );

      if (productIndex != -1) {
        const updatedProductsData = productsData.filter(
          (product) => product.id != parseInt(productId)
        );
        const deletedProduct = productsData[productIndex];

        return fs
          .writeFile(
            productsFilePath,
            JSON.stringify(updatedProductsData, null, 2),
            "utf-8"
          )
          .then(() => {
            return deletedProduct;
          })
          .catch((error) => {
            throw new Error("Erro ao deletar o produto: " + error.message);
          });
      } else {
        throw new Error("Produto não encontrado");
      }
    })
    .catch((error) => {
      throw new Error("Erro ao buscar produtos: " + error.message);
    });
};

const addProduct = (newProductData) => {
  return getProducts()
    .then((productsData) => {
      let maxProductId = -1;
      productsData.forEach((product) => {
        if (product.id > maxProductId) {
          maxProductId = product.id;
        }
      });
      const newProductId = ++maxProductId;
      const newProductWithId = Object.assign(
        { id: newProductId },
        newProductData
      );

      productsData.push(newProductWithId);

      return fs
        .writeFile(
          productsFilePath,
          JSON.stringify(productsData, null, 2),
          "utf-8"
        )
        .then(() => {
          return newProductWithId;
        })
        .catch((error) => {
          throw new Error("Erro ao criar o produto: " + error.message);
        });
    })
    .catch((error) => {
      throw new Error("Erro ao buscar produtos: " + error.message);
    });
};

const applyDiscount = (productId, discount) => {
  return getProducts()
    .then((productsData) => {
      if (discount >= 0 && discount <= 100) {
        const productIndex = productsData.findIndex((product) => {
          return product.id === parseInt(productId);
        });
        if (productIndex != -1) {
          const existingProduct = productsData[productIndex];
          const discountMultiplier = 1 - discount / 100;
          existingProduct.price = Number((existingProduct.price * discountMultiplier).toFixed(2));
          productsData[productIndex] = existingProduct;

          return fs
            .writeFile(
              productsFilePath,
              JSON.stringify(productsData, null, 2),
              "utf-8"
            )
            .then(() => {
              return existingProduct;
            })
            .catch((error) => {
              throw new Error(
                "Erro ao aplicar o desconto no produto: " + error.message
              );
            });
        } else {
          throw new Error("Produto não encontrado");
        }
      }
    })
    .catch((error) => {
      throw new Error("Erro ao buscar produtos: " + error.message);
    });
};

const updateProductRating = (productId, rating) => {
  if(rating && rating <=5) {
    return getProducts()
      .then((productsData) => {
        const productIndex = productsData.findIndex((product) => {
          return product.id === parseInt(productId);
        });
        if (productIndex != -1) {
          const existingProduct = productsData[productIndex];
          const {rate, count} = existingProduct.rating;

          existingProduct.rating.rate = ((rate * count + rating) / (count + 1)).toFixed(2);
          existingProduct.rating.count += 1;
          productsData[productIndex] = existingProduct;

          return fs
            .writeFile(
              productsFilePath,
              JSON.stringify(productsData, null, 2),
              "utf-8"
            )
            .then(() => {
              return existingProduct;
            })
            .catch((error) => {
              throw new Error(
                "Erro ao aplicar o desconto no produto: " + error.message
              );
            });
        } else {
          throw new Error("Produto não encontrado");
        }
      })
      .catch((error) => {
        throw new Error("Erro ao buscar produtos: " + error.message);
      });
  } else {
    throw new Error("Nota inválida")
  }
}

module.exports = {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProducts,
  getProductByName,
  applyDiscount,
  updateProductRating,
};
