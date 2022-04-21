const uri = require("url");
const downloader = require("image-downloader");

const settings = require("./config.json");
const util = require("./util");
// Data
const variable = require("./variables.json");
const data = {};

async function downloadProducts(dest, index, products) {
  if (index === products.length) {
    util.updateData({
      currentProduct: 0
    });
    return false;
  }
  const {
    product
  } = settings.selectors;
  util.alertScreen(`Bắt đầu tải tài nguyên...`);
  try {
    const page = await util.goTo(products[index].url, false);
    const productData = await page.evaluate((selector) => {
      return Array.prototype.slice.call(document.querySelectorAll(selector.images)).map(image => image.dataset.srcset)
    }, product);

    productData.map(async srcset => {
      util.createFolder(dest + "/products/" + products[index].name);
      await downloader.image({
        dest: dest + "/products/" + products[index].name,
        url: util.isValidUrl(util.getLargestSrc(srcset)) ? util.getLargestSrc(srcset) : 'https:' + util.getLargestSrc(srcset)
      });
    });

    util.alertScreen(`================ Đã tải sản phẩm ${products[index].name} =============`);
    util.updateData({
      currentProduct: index
    });
    await downloadProducts(dest, index + 1, products);
  } catch (err) {
    console.log(err);
  }
}

async function getProducts(url, demoName, collectionName = "all", pageNum = variable.currentPage, products = []) {
  if (collectionName === "all")
    util.alertScreen("Lấy tất cả sản phẩm");
  else
    util.alertScreen("Lấy sản phẩm của collection: " + collectionName);
  // Load new url with page param
  const newUrl = new uri.URL(url);
  newUrl.searchParams.set("page", pageNum);
  // Create folders
  const dest = "./downloaded/" + demoName + "/" + collectionName;
  util.createFolder("./downloaded/" + demoName);
  util.createFolder(dest);
  util.createFolder(dest + "/products");

  // try pagination
  util.alertScreen("Đang thử lấy dữ liệu trang " + pageNum);
  try {
    const productSelector = settings.selectors.productUrls;
    const page = await util.goTo(newUrl.href);
    const results = await page.evaluate((selector) => {
      return Array.prototype.slice.call(document.querySelectorAll(selector))
        .map(product => ({
          name: product.textContent.replace(/([\/\"\'])/g, "-"),
          url: product.href
        }));
    }, productSelector);
    if (results.length) {
      results.forEach(obj => products.push(obj));
      util.updateData({
        currentPage: pageNum
      });
      await downloadProducts(dest, variable.currentProduct, products);
      await getProducts(url, demoName, collectionName, pageNum + 1);
    } else {
      util.updateData({
        currentPage: 0
      });
      return data[demoName].products;
    }
  } catch (err) {
    console.log(err);
  }
}

async function getProductsByCollection(demoName, index = 0) {
  if (!data[demoName].collections[index]) {
    util.updateData({
      currentCollection: 0
    });
    return false;
  }

  const collection = data[demoName].collections[index];
  await getProducts(collection.url, demoName, collection.name);

  util.updateData({
    currentCollection: index
  });
  await getProductsByCollection(demoName, index + 1);
}

async function getCollections(index, demos) {
  if (index === demos.length) {
    return false;
  }
  console.log(demos[index]);
  const {
    name,
    url
  } = demos[index];

  const {
    collections
  } = settings.selectors;

  data[name] = {};

  util.alertScreen("Đang lấy thông tin demo " + name);

  const demoUrlDetail = new uri.URL(url);
  const demoId = demoUrlDetail.searchParams.get("preview_theme_id");
  const allCollectionUrl = demoUrlDetail.origin + settings.uris.collections + "?preview_theme_id=" + demoId;
  await util.goTo(allCollectionUrl, false).then(async page => {
    data[name].collections = await page.evaluate((selector) => {
      return Array.prototype.slice.call(document.querySelectorAll(selector))
        .map(collection => ({
          name: collection.textContent.replace(/([\/\"\'])/g, "-"),
          url: collection.href
        }));
    }, collections)
  }).catch(err => console.log(err));

  data[name].collections.forEach(collection => collection.url += demoUrlDetail.search);

  if (data[name].collections.length) {
    await getProductsByCollection(name, variable.currentCollection);
  } else {
    util.alertScreen("Trang này không chia nhiều collection");
    util.alertScreen("Bắt đầu lấy dữ liệu sản phẩm...");
    await getProducts(allCollectionUrl, name);
  }

  util.updateData({
    currentDemoIndex: index
  });

  await getCollections(index + 1, demos);
}

async function downloadArticle(articles, index = 0) {
  if(index === articles.length)
    return false;
  const {content} = settings.selectors.article;
  const article = articles[index];
  const dest = "./downloaded/Home Default/blog";
  util.createFolder(dest);
  util.createFolder(dest + "/" + article.name);

  // Download thumbnail
  await downloader.image({
    dest: dest + "/" + article.name,
    url: util.isValidUrl(util.getLargestSrc(article.thumbnail)) ? util.getLargestSrc(article.thumbnail) : 'https:' + util.getLargestSrc(article.thumbnail)
  });
  await util.goTo(article.url).then(async page => {
    const imgs = await page.evaluate((content) => {
      return Array.prototype.slice.call(document.querySelectorAll(content)).map(img => img.dataset.srcset);
    },content);

    imgs.forEach(async img => {
      await downloader.image({
        dest: dest + "/" + article.name,
        url: util.isValidUrl(util.getLargestSrc(img)) ? util.getLargestSrc(img) : 'https:' + util.getLargestSrc(img)
      });
    })
  }).catch(err => console.error(err));
  //  await 
  await downloadArticle(articles, index + 1);
}

async function getBlog(demos) {
  const {
    name, url
  } = demos[0];

  const tryPage = async (page = 1) => {
    const {title, thumbnail, wrapper} = settings.selectors.article;

    const demoUrlDetail = new uri.URL(url);
    const blogUrl = demoUrlDetail.origin + settings.uris.blog + '?page=' + page;

    data[name] = {};
    await util.goTo(blogUrl, true).then(async page => {
      data[name].articles = await page.evaluate((wrapper, title, thumbnail) => {
        const data = [];
        const articles = document.querySelectorAll(wrapper);
        articles.forEach(article => {
          const articleLink = article.querySelector(title);
          const articleThumbnail = article.querySelector(thumbnail);

          data.push({
            url: articleLink.href,
            name: articleLink.textContent.replace(/([\/\"\'\.])/g, " "),
            thumbnail: articleThumbnail.dataset.srcset
          });
        })
        return data;
      }, wrapper, title, thumbnail);
    }).catch(err => console.log(err));
    if(data[name].articles.length) {
      util.alertScreen("Bắt đầu tải bài viết");
      await downloadArticle(data[name].articles);
      await tryPage(page + 1);
    }
  }

  await tryPage();
}

async function main() {
  await util.init();
  // Get all selectors
  const {
    demos
  } = settings.selectors;
  // Base Url
  let baseurl = settings.host;
  util.createFolder("./downloaded");
  // Get all demos
  util.alertScreen("Đang lấy demo")
  await util.goTo(baseurl, false).then(async page => {
    data.demos = await page.evaluate(selector => {
      return Array.prototype.slice.call(document.querySelectorAll(selector)).map(elem => {
        if (elem.children.length)
          elem.children[0].remove()
        return {
          name: elem.textContent.replace(/([\/\"\'])/g, "-"),
          url: elem.href
        }
      });
    }, demos);
  }).catch(err => {
    console.log(err);
  });
  /**
   * Get Products
   */
  console.log(data.demos);
  await getCollections(variable.currentDemoIndex, data.demos);
  /**
   * Get Blog
   */
  // await getBlog(data.demos);
}

main();
