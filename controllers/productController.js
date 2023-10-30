const fs = require("fs").promises;
const path = require("path");
const cheerio = require("cheerio");
const unirest = require("unirest");

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



async function extractMetadata(url) {
  try {
    const head = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    };
    const data = await unirest.get(url).headers(head);

    const $ = cheerio.load(data.body);
    const result = {};

    if (/amzn|amazon/.test(url)) {
      result.site = "Amazon";
      $("h1#title").each((i, el) => {
        result.title = $(el).text().trim();
      });

      const originalPrice = $('span.a-price[data-a-strike="true"]')
        .find("span.a-offscreen")
        .text();
      if (originalPrice) {
        result["price-original"] = originalPrice;
      }

      const conditionElement = $("span.best-offer-name");
      result.condition = conditionElement.text().trim();

      const descriptionElement = $("#feature-bullets .a-list-item").first();
      result.description = descriptionElement.text().trim();

      const priceValue = $("span.a-price").find("span").first().text();
      if (priceValue) {
        result.price = priceValue;
      }

      const imageElement = $('div#imgTagWrapperId').find('img');
const dynamicImageData = imageElement.attr('data-a-dynamic-image');

if (dynamicImageData) {
  const imageMap = JSON.parse(dynamicImageData);
  let maxWidth = 0;
  let imageUrl = '';

  // Iterating over the entries to find the image with the maximum width
  Object.entries(imageMap).forEach(([url, dimensions]) => {
    if (dimensions[0] > maxWidth) {
      maxWidth = dimensions[0];
      imageUrl = url;
    }
  });

  result.image = imageUrl;
}

      const breadcrumbsList = [];
      $("div#wayfinding-breadcrumbs_feature_div ul li").each((i, el) => {
        const breadcrumb = $(el).find("a").text().trim();
        if (breadcrumb) {
          breadcrumbsList.push(breadcrumb);
        }
      });

      let nestedCategories = {};
      let currentLevel = nestedCategories;
      breadcrumbsList.forEach((category, index) => {
        if (index === breadcrumbsList.length - 1) {
          currentLevel[category] = result.title;
        } else {
          currentLevel[category] = {};
          currentLevel = currentLevel[category];
        }
      });

      result.breadcrumbs = nestedCategories;
    } else if (/magazineluiza|magazinevoce/.test(url)) {
      result.site = "Magazine Luiza";
      result.title = $('h1[data-testid="heading-product-title"]').text().trim();
      result.price = $('p[data-testid="price-value"]').text().trim();
      result["price-original"] = $('p[data-testid="price-original"]')
        .text()
        .trim();
        result.image = $('img[data-testid="image-selected-thumbnail"]').attr(
          "src"
        );
      result.description = $('div[data-testid="rich-content-container"]')
        .text()
        .trim();
      result.condition = $('p[data-testid="installment"]').text().trim();

      const breadcrumbsList = [];
            $("div.sc-dhKdcB.cFngep.sc-sLsrZ.lfArPD a.sc-koXPp.bXTNdB").each((i, el) => {
                const breadcrumb = $(el).text().trim();
                if (breadcrumb) {
                    breadcrumbsList.push(breadcrumb);
                }
            });

            let nestedCategories = {};
            let currentLevel = nestedCategories;
            breadcrumbsList.forEach((category, index) => {
                if (index === breadcrumbsList.length - 1) {
                    currentLevel[category] = result.title;
                } else {
                    currentLevel[category] = {};
                    currentLevel = currentLevel[category];
                }
            });

            result.breadcrumbs = nestedCategories;

    } else {
      throw new Error(
        'O URL fornecido não contém "amzn" ou "amazon" ou "magazineluiza"'
      );
    }

    return { metadata: result };
  } catch (error) {
    console.error("Erro ao extrair metadados:", error);
    return { error: error.message };
  }
}


module.exports = {
  extractMetadata,
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProducts,
  getProductByName,
  applyDiscount,
  updateProductRating,
};
