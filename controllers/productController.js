const fs = require("fs").promises;
const path = require("path");
const cheerio = require("cheerio");
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const ogs = require("open-graph-scraper");

const productsFilePath = path.join(__dirname, "../data/products.json");
const prisma = new PrismaClient();

const getProducts = async () => {
  try {
    const products = await prisma.products.findMany();
    return products;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getProductGroups = async () => {
  try {
    const productGroups = await prisma.productGroup.findMany();
    return productGroups;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getProductsByGroup = async (groupId) => {
  try {
    const productsInGroup = await prisma.productGroupAssociation.findMany({
      where: { groupId: parseInt(groupId) },
      include: { product: true },
    });

    return productsInGroup.map((item) => item.product);
  } catch (error) {
    throw new Error("Erro ao buscar produtos do grupo: " + error.message);
  }
};

const getProductsPaginated = async (page = 1, pageSize = 5) => {
  try {
    if (page === 0) {
      page = 1;
    }
    const startIndex = (page - 1) * pageSize;
    const products = await prisma.products.findMany({
      skip: startIndex,
      take: pageSize,
      orderBy: {
        id: "desc",
      },
    });
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

const createProductGroup = async (groupData, productIds) => {
  await prisma.$connect();

  try {
    let newGroup;

    if (productIds && productIds.length > 0) {
      newGroup = await prisma.productGroup.create({
        data: {
          ...groupData,
          ProductGroupAssociation: {
            create: productIds.map((productId) => ({
              product: { connect: { id: parseInt(productId) } },
            })),
          },
        },
      });
    } else {
      // Se não houver IDs de produtos, criar apenas o grupo
      newGroup = await prisma.productGroup.create({
        data: groupData,
      });
    }

    return newGroup;
  } catch (error) {
    throw new Error("Erro ao criar o grupo: " + error.message);
  } finally {
    // Fecha a conexão após a conclusão
    await prisma.$disconnect();
  }
};

const addProductToGroup = async (productId, groupId) => {
  await prisma.$connect();

  try {
    // Verifica se o produto e o grupo existem
    const product = await prisma.products.findUnique({
      where: { id: parseInt(productId) },
    });

    const group = await prisma.productGroup.findUnique({
      where: { id: parseInt(groupId) },
    });

    if (!product || !group) {
      throw new Error("Produto ou grupo não encontrado");
    }

    // Adiciona o produto ao grupo na tabela de junção
    const productGroupMembership = await prisma.ProductGroupAssociation.create({
      data: {
        productId: parseInt(productId),
        groupId: parseInt(groupId),
      },
    });

    // Incrementa o contador de clicks do grupo
    await prisma.productGroup.update({
      where: { id: parseInt(groupId) },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    return productGroupMembership;
  } catch (error) {
    throw new Error("Erro ao adicionar o produto ao grupo: " + error.message);
  }
};

const deleteProducts = async (productId) => {
  await prisma.$connect();
  try {
    const product = await prisma.products.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      throw new Error("Produto não encontrado");
    }

    const deletedProduct = await prisma.products.delete({
      where: { id: parseInt(productId) },
    });
    console.log("Deletando produto com ID", productId);

    return deletedProduct;
  } catch (error) {
    throw new Error("Erro ao deletar o produto: " + error.message);
  }
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
      throw new Error("Produto não encontrado");
    }

    const updatedProduct = await prisma.products.update({
      where: { id: parseInt(productId) },
      data: {
        clicks: product.clicks + 1, // Increment clicks by 1
      },
    });

    return updatedProduct;
  } catch (error) {
    throw new Error("Erro ao buscar ou atualizar o produto: " + error.message);
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

const formatPrice = (currentPrice) => {
  if (currentPrice) {
    let priceWithoutSymbol = currentPrice.replace(/^R\$\s?/, "");


    if (
      priceWithoutSymbol.includes(",") &&
      priceWithoutSymbol.includes(".")
    ) {
      priceWithoutSymbol = priceWithoutSymbol.replace(/\./g, "");
      priceWithoutSymbol = priceWithoutSymbol.replace(/\,/g, ".");
    } else {
      priceWithoutSymbol = priceWithoutSymbol.replace(/\,/g, ".");
    }

    if (priceWithoutSymbol.split(".")[1].length === 3) {
      priceWithoutSymbol = priceWithoutSymbol.replace(/\./g, "");
    }
    parseFloat(priceWithoutSymbol);

    return priceWithoutSymbol;
  }
  return currentPrice;
};

async function extractMetadata(url, maxRetries = 5) {
  let retries = 0;
  while (retries < maxRetries) {
    console.log("Extraindo");
    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        },
      });

      if (response.data.includes("errors/500")) {
        throw new Error("Erro 500 detectado na resposta");
      }

      const finalUrl = response.request.res.responseUrl || url;
      const $ = cheerio.load(response.data);
      const result = {};

      if (/mercadolivre/.test(finalUrl)) {
        result.website = "Mercado Livre";
        result.title = $("div.ui-eshop-item__link")
          .find("h3.ui-eshop-item__title")
          .text()
          .trim();
        result.conditionPayment = $(
          "p.ui-eshop-item__installments.ui-eshop-item__installments--interest"
        )
          .text()
          .trim();
        result.imagePath = $(
          "div.ui-eshop-item__image_container.ui-eshop-item__image_container--row"
        )
          .find("img.ui-eshop-item__image")
          .attr("src");
        const priceElement = $(
          "span.andes-money-amount.andes-money-amount--cents-superscript"
        ).first();
        const priceText = priceElement.text().trim();
        const priceMatch = priceText.match(/R\$\s*([\d.,]*)/);
        if (priceMatch) {
          result.currentPrice = priceMatch[0];
        }
        const oldPrice = $(
          "s.andes-money-amount.andes-money-amount-combo__previous-value.andes-money-amount--previous.andes-money-amount--cents-comma"
        )
          .text()
          .trim();
        if (oldPrice) {
          result["price-original"] = oldPrice;
        }
        result.buyLink = modifiedUrl || finalUrl;
      } else if (/amzn|amazon/.test(finalUrl)) {
        result.website = "Amazon";

        const parsedUrl = new URL(finalUrl);
        parsedUrl.searchParams.set("tag", "tomepromo00-20");
        const modifiedUrl = parsedUrl.href;
        result.buyLink = modifiedUrl || finalUrl;

        $("h1#title").each((i, el) => {
          result.title = $(el).text().trim();
        });

        const originalPrice = $(
          'span.a-price[data-a-strike="true"] > .a-offscreen'
        )
          .first()
          .text();
        if (originalPrice) {
          result.originalPrice = originalPrice;
        }

        const conditionElement = $("span.best-offer-name");
        result.conditionPayment = conditionElement.text().trim();

        const descriptionElement = $("#feature-bullets .a-list-item").first();
        result.description = descriptionElement.text().trim();

        const priceElement = $("span.a-offscreen").filter((i, el) => {
          const text = $(el).text().trim();
          return text.startsWith("R$");
        });

        const priceValues = priceElement
          .map((i, el) => {
            return $(el).text().trim();
          })
          .get();

        const firstPrice = priceValues.length > 0 ? priceValues[0] : null;

        if (firstPrice) {
          result.currentPrice = firstPrice;
        }

        console.log("Price Element HTML:", priceElement.html());

        const recurrencePriceText = $("span#sns-base-price")
        .first()
        .text()
        .trim();
      
      // Fazer split por "R$" e pegar o segundo elemento (o primeiro valor após "R$")
      const recurrencePriceArray = recurrencePriceText.split("R$");
      const firstRecurrencePrice = recurrencePriceArray.length > 1 ? `R$${recurrencePriceArray[1]}` : null;
      
      if (firstRecurrencePrice) {
        result.recurrencePrice = firstRecurrencePrice;
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
          result.productCode = cleanedCode;
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

          result.imagePath = imageUrl;
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
      } else if (/magazineluiza|magalu|magazinevoce/.test(finalUrl)) {
        let modifiedUrl;

        if (finalUrl.includes("magazineluiza.com.br")) {
          modifiedUrl = finalUrl.replace(
            "magazineluiza.com.br",
            "magazinevoce.com.br/magazinetomepromo154"
          );
        } else {
          modifiedUrl = finalUrl.replace(
            /https:\/\/www\.magazinevoce\.com\.br\/magazine([^/]+)/,
            "https://www.magazinevoce.com.br/magazinetomepromo154"
          );
        }

        result.buyLink = modifiedUrl || finalUrl;
        result.website = "Magazine Luiza";
        result.title = $('h1[data-testid="heading-product-title"]')
          .text()
          .trim();
        result.currentPrice = $('p[data-testid="price-value"]').text().trim();
        result.originalPrice = $('p[data-testid="price-original"]')
          .text()
          .trim();
        result.imagePath = $(
          'img[data-testid="image-selected-thumbnail"]'
        ).attr("src");

        const codeElement = $("span.sc-dcJsrY.daMqkh:contains('Código')")
          .text()
          .trim();
        if (codeElement) {
          const cleanedCode = codeElement
            .replace(/Código/g, "")
            .replace(/[^0-9ó]/g, "");

          result.productCode = cleanedCode;
        }

        result.description = $('div[data-testid="rich-content-container"]')
          .text()
          .trim();
        result.conditionPayment = $('p[data-testid="installment"]')
          .text()
          .trim();

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
        console.log(
          'O URL fornecido não contém "amzn" ou "amazon" ou "magazineluiza" ou "magazinevoce" ou mercadolivre'
        );
        await ogs({
          url: url,
          fetchOptions: { headers: { "user-agent": userAgent } },
        }).then((data) => {
          const { error, result: ogsResult } = data;
          if (!error && ogsResult) {
            result.title = ogsResult.title
            result.productName = ogsResult.title
            // Adicione os campos do OGS aos resultados
            ogsResult.ogImage = ogsResult.ogImage || [];
            if (ogsResult.ogImage.length > 0) {
              // Use apenas a primeira imagem do OGS
              result.imagePath = ogsResult.ogImage[0].url;
            }
          }
        });
      }

      if (result.website != "Mercado Livre") {
        const userAgent =
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

        await ogs({
          url: url,
          fetchOptions: { headers: { "user-agent": userAgent } },
        }).then((data) => {
          const { error, result: ogsResult } = data;
          if (!error && ogsResult) {
            // Adicione os campos do OGS aos resultados
            ogsResult.ogImage = ogsResult.ogImage || [];
            if (ogsResult.ogImage.length > 0) {
              // Use apenas a primeira imagem do OGS
              result.imagePath = ogsResult.ogImage[0].url;
            }
          }
        });
      }

      return { metadata: result };
    } catch (error) {
      console.error("Erro ao extrair metadados:", error);
      retries++;
      if (retries < maxRetries) {
        console.log("Tentando extrair novamente.");
        // Aguarde por um curto período antes de tentar novamente
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.error(
          "Número máximo de tentativas excedido. Não foi possível extrair os metadados."
        );
        return { error: "Número máximo de tentativas excedido." };
      }
    }
  }
}

async function extractMetadata2(url, amazon, magazine, maxRetries = 5) {
  let retries = 0;
  while (retries < maxRetries) {
    console.log("Extraindo");
    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        },
      });

      if (response.data.includes("errors/500")) {
        throw new Error("Erro 500 detectado na resposta");
      }

      const finalUrl = response.request.res.responseUrl || url;
      const $ = cheerio.load(response.data);
      const result = {};

      if (/mercadolivre/.test(finalUrl)) {
        result.website = "Mercado Livre";
        result.title = $("div.ui-eshop-item__link")
          .find("h3.ui-eshop-item__title")
          .text()
          .trim();
        result.conditionPayment = $(
          "p.ui-eshop-item__installments.ui-eshop-item__installments--interest"
        )
          .text()
          .trim();
        result.imagePath = $(
          "div.ui-eshop-item__image_container.ui-eshop-item__image_container--row"
        )
          .find("img.ui-eshop-item__image")
          .attr("src");
        const priceElement = $(
          "span.andes-money-amount.andes-money-amount--cents-superscript"
        ).first();
        const priceText = priceElement.text().trim();
        const priceMatch = priceText.match(/R\$\s*([\d.,]*)/);
        if (priceMatch) {
          result.currentPrice = formatPrice(priceMatch[0]);
        }
        const oldPrice = $(
          "s.andes-money-amount.andes-money-amount-combo__previous-value.andes-money-amount--previous.andes-money-amount--cents-comma"
        )
          .text()
          .trim();
        if (oldPrice) {
          result.originalPrice = formatPrice(oldPrice);
        }

        result.buyLink = modifiedUrl || finalUrl;


      } else if (/amzn|amazon/.test(finalUrl)) {
        result.website = "Amazon";

        if(amazon){

        const parsedUrl = new URL(finalUrl);
        parsedUrl.searchParams.set("tag", amazon);
        const modifiedUrl = parsedUrl.href;
        result.buyLink = modifiedUrl || finalUrl;
      }

        $("h1#title").each((i, el) => {
          result.title = $(el).text().trim();
        });

        const originalPrice = $(
          'span.a-price[data-a-strike="true"] > .a-offscreen'
        )
          .first()
          .text();
        if (originalPrice) {
          result.originalPrice = formatPrice(originalPrice);
        }

        const conditionElement = $("span.best-offer-name");
        result.conditionPayment = conditionElement.text().trim();

        const descriptionElement = $("#feature-bullets .a-list-item").first();
        result.description = descriptionElement.text().trim();

        const priceElement = $("span.a-offscreen").filter((i, el) => {
          const text = $(el).text().trim();
          return text.startsWith("R$");
        });

        const priceValues = priceElement
          .map((i, el) => {
            return $(el).text().trim();
          })
          .get();

        const firstPrice = priceValues.length > 0 ? priceValues[0] : null;

        if (firstPrice) {
          result.currentPrice = formatPrice(firstPrice);
        }

        console.log("Price Element HTML:", priceElement.html());

        const recurrencePriceText = $("span#sns-base-price")
        .first()
        .text()
        .trim();
      
      // Fazer split por "R$" e pegar o segundo elemento (o primeiro valor após "R$")
      const recurrencePriceArray = recurrencePriceText.split("R$");
      const firstRecurrencePrice = recurrencePriceArray.length > 1 ? `R$${recurrencePriceArray[1]}` : null;
      
      if (firstRecurrencePrice) {
        result.recurrencePrice = formatPrice(firstRecurrencePrice);
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
          result.productCode = cleanedCode;
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

          result.imagePath = imageUrl;
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
      } else if (/magazineluiza|magalu|magazinevoce/.test(finalUrl)) {
        let modifiedUrl;

        if(magazine) {
        if (finalUrl.includes("magazineluiza.com.br")) {
          modifiedUrl = finalUrl.replace(
            "magazineluiza.com.br",
            `magazinevoce.com.br/${magazine}`
          );
        } else {
          modifiedUrl = finalUrl.replace(
            /https:\/\/www\.magazinevoce\.com\.br\/magazine([^/]+)/,
            `https://www.magazinevoce.com.br/${magazine}`
          );
        }
      }
      console.log(modifiedUrl)

        result.buyLink = modifiedUrl || finalUrl;
        result.website = "Magazine Luiza";
        result.title = $('h1[data-testid="heading-product-title"]')
          .text()
          .trim();
        result.currentPrice = formatPrice($('p[data-testid="price-value"]').text().trim());
        result.originalPrice = formatPrice($('p[data-testid="price-original"]'))
          .text()
          .trim();
        result.imagePath = $(
          'img[data-testid="image-selected-thumbnail"]'
        ).attr("src");

        const codeElement = $("span.sc-dcJsrY.daMqkh:contains('Código')")
          .text()
          .trim();
        if (codeElement) {
          const cleanedCode = codeElement
            .replace(/Código/g, "")
            .replace(/[^0-9ó]/g, "");

          result.productCode = cleanedCode;
        }

        result.description = $('div[data-testid="rich-content-container"]')
          .text()
          .trim();
        result.conditionPayment = $('p[data-testid="installment"]')
          .text()
          .trim();

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
        console.log(
          'O URL fornecido não contém "amzn" ou "amazon" ou "magazineluiza" ou "magazinevoce" ou mercadolivre'
        );
        await ogs({
          url: url,
          fetchOptions: { headers: { "user-agent": userAgent } },
        }).then((data) => {
          const { error, result: ogsResult } = data;
          if (!error && ogsResult) {
            result.title = ogsResult.title
            result.productName = ogsResult.title
            // Adicione os campos do OGS aos resultados
            ogsResult.ogImage = ogsResult.ogImage || [];
            if (ogsResult.ogImage.length > 0) {
              // Use apenas a primeira imagem do OGS
              result.imagePath = ogsResult.ogImage[0].url;
            }
          }
        });
      }

      if (result.website != "Mercado Livre") {
        const userAgent =
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

        await ogs({
          url: url,
          fetchOptions: { headers: { "user-agent": userAgent } },
        }).then((data) => {
          const { error, result: ogsResult } = data;
          if (!error && ogsResult) {
            // Adicione os campos do OGS aos resultados
            ogsResult.ogImage = ogsResult.ogImage || [];
            if (ogsResult.ogImage.length > 0) {
              // Use apenas a primeira imagem do OGS
              result.imagePath = ogsResult.ogImage[0].url;
            }
          }
        });
      }

      return { metadata: result };
    } catch (error) {
      console.error("Erro ao extrair metadados:", error);
      retries++;
      if (retries < maxRetries) {
        console.log("Tentando extrair novamente.");
        // Aguarde por um curto período antes de tentar novamente
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.error(
          "Número máximo de tentativas excedido. Não foi possível extrair os metadados."
        );
        return { error: "Número máximo de tentativas excedido." };
      }
    }
  }
}

module.exports = {
  extractMetadata,
  extractMetadata2,
  getProductGroups,
  getProductsByGroup,
  updateProductClick,
  getProductsPaginated,
  addProduct,
  addProductToGroup,
  createProductGroup,
  getProducts,
  getProductById,
  updateProduct,
  deleteProducts,
  getProductByName,
  applyDiscount,
  updateProductRating,
};
