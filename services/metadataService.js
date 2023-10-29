const cheerio = require("cheerio");
const unirest = require("unirest");

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

      const imageElement = $("img#landingImage");
      result.image = imageElement.attr("src");

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
};
