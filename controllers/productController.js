const fs = require("fs").promises;
const path = require("path");
const cheerio = require("cheerio");
const unirest = require("unirest");
const { PrismaClient } = require('@prisma/client')


const productsFilePath = path.join(__dirname, "../data/products.json");
const prisma = new PrismaClient()



const getProducts = async () => {
  try {
    const products = await prisma.products.findMany();
    return products;
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
          existingProduct.currentPrice = updateData.price;
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

const addProduct = async (newProductData) => {
  await prisma.$connect();
  try {
    const newProduct = await prisma.products.create({
      data: newProductData,
    });
    return newProduct;
  } catch (error) {
    throw new Error("Erro ao criar o produto: " + error.message);
  }
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
          existingProduct.currentPrice = Number(
            (existingProduct.currentPrice * discountMultiplier).toFixed(2)
          );
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

const updateProductClick = async (productId) => {
  await prisma.$connect();
  try {
    const product = await prisma.products.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    const updatedProduct = await prisma.products.update({
      where: { id: parseInt(productId) },
      data: {
        clicks: product.clicks + 1, // Increment clicks by 1
      },
    });

    return updatedProduct;
  } catch (error) {
    throw new Error('Erro ao buscar ou atualizar o produto: ' + error.message);
  }
};

const updateProductRating = (productId, rating) => {
  if (rating && rating <= 5) {
    return getProducts()
      .then((productsData) => {
        const productIndex = productsData.findIndex((product) => {
          return product.id === parseInt(productId);
        });
        if (productIndex != -1) {
          const existingProduct = productsData[productIndex];
          const { rate, count } = existingProduct.rating;

          existingProduct.rating.rate = (
            (rate * count + rating) /
            (count + 1)
          ).toFixed(2);
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
    throw new Error("Nota inválida");
  }
};

async function extractMetadata(url) {
  console.log("Extraindo")
  try {
    const head = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    };
    const data = await unirest.get(url).headers(head);
    console.log(typeof data.body);

    const $ = cheerio.load(data.body);
    const result = {};

    if (/mercadolivre/.test(url)) {
      result.site = "Mercado Livre";
      result.title = $('div.ui-eshop-item__link').find('h3.ui-eshop-item__title').text().trim();
      result.conditionPayment = $('p.ui-eshop-item__installments.ui-eshop-item__installments--interest').text().trim();
      result.imagePath= $('div.ui-eshop-item__image_container.ui-eshop-item__image_container--row').find('img.ui-eshop-item__image').attr('src');
      const priceElement = $('span.andes-money-amount.andes-money-amount--cents-superscript').first();
      const priceText = priceElement.text().trim();
      const priceMatch = priceText.match(/R\$\s*([\d.,]*)/);
      if (priceMatch) {
        result.currentPrice = priceMatch[0];
      }
      const oldPrice = $('s.andes-money-amount.andes-money-amount-combo__previous-value.andes-money-amount--previous.andes-money-amount--cents-comma').text().trim();
      if (oldPrice) {
        result['price-original'] = oldPrice;
      }
    }
    
    

    else if (/amzn|amazon/.test(url)) {
      result.site = "Amazon";
      $("h1#title").each((i, el) => {
        result.title = $(el).text().trim();
      });

      const originalPrice = $('span.a-price[data-a-strike="true"] > .a-offscreen').first().text();
if (originalPrice) {
    result.originalPrice = originalPrice;
}

      const conditionElement = $("span.best-offer-name");
      result.conditionPayment = conditionElement.text().trim();

      const descriptionElement = $("#feature-bullets .a-list-item").first();
      result.description = descriptionElement.text().trim();

      const priceValue = $("span.a-price").find("span").first().text();
      if (priceValue) {
        result.currentPrice = priceValue;
      }

      const recurrencePrice = $("span#sns-base-price")
        .first()
        .text()
        .split("\n")[0]
        .trim();
      if (recurrencePrice) {
        result.recurrencePrice = recurrencePrice;
      }

      const codeElement = $(
        "th.a-color-secondary.a-size-base.prodDetSectionEntry:contains('ASIN')"
      )
        .nextAll("td")
        .first()
        .text()
        .trim();
      if (codeElement) {
        const cleanedCode = codeElement.replace(/[^a-zA-Z0-9]/g, "");
        result.productCode= cleanedCode;
      }

      const imageElement = $("div#imgTagWrapperId").find("img");
      const dynamicImageData = imageElement.attr("data-a-dynamic-image");

      if (dynamicImageData) {
        const imageMap = JSON.parse(dynamicImageData);
        let maxWidth = 0;
        let imageUrl = "";

        // Iterating over the entries to find the image with the maximum width
        Object.entries(imageMap).forEach(([url, dimensions]) => {
          if (dimensions[0] > maxWidth) {
            maxWidth = dimensions[0];
            imageUrl = url;
          }
        });

        result.imagePath= imageUrl;
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
    } else if (/magazineluiza|magalu|magazinevoce/.test(url)) {
      result.site = "Magazine Luiza";
      result.title = $('h1[data-testid="heading-product-title"]').text().trim();
      result.currentPrice = $('p[data-testid="price-value"]').text().trim();
      result.originalPrice = $('p[data-testid="price-original"]')
        .text()
        .trim();
      result.imagePath= $('img[data-testid="image-selected-thumbnail"]').attr(
        "src"
      );

      const codeElement = $("span.sc-dcJsrY.daMqkh:contains('Código')").text().trim();
      if (codeElement) {
        const cleanedCode = codeElement.replace(/Código/g, "").replace(/[^0-9ó]/g, "");

          result.productCode = cleanedCode;
      }

      result.description = $('div[data-testid="rich-content-container"]')
        .text()
        .trim();
      result.conditionPayment = $('p[data-testid="installment"]').text().trim();

      const breadcrumbsList = [];
      $("div.sc-dhKdcB.cFngep.sc-sLsrZ.lfArPD a.sc-koXPp.bXTNdB").each(
        (i, el) => {
          const breadcrumb = $(el).text().trim();
          if (breadcrumb) {
            breadcrumbsList.push(breadcrumb);
          }
        }
      );

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
        'O URL fornecido não contém "amzn" ou "amazon" ou "magazineluiza" ou "magazinevoce" ou mercadolivre'
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
  updateProductClick,
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProducts,
  getProductByName,
  applyDiscount,
  updateProductRating,
};
