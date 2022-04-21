const uri = require("url");

const settings = require("../config.json");
const ulti = require("../util");

const data = {};

async function getCollections(index, demos, page) {
  if (index === demos.length) {
    return false;
  }
  const {
    name,
    url
  } = demos[index];

  const {
    collections
  } = settings.selectors;

  const demoUrlDetail = new uri.URL(url);
  await ulti.goTo(demoUrlDetail.origin + settings.uris.collections + demoUrlDetail.search).then(async page => {
    data.collections = await page.evaluate((selector) => {
      return Array.prototype.slice.call(document.querySelectorAll(selector)).map(collection => ({
        name: collection.textContent,
        url: collection.href
      }));
    }, collections)
  }).catch(err => console.log(err));

  return data;
}

module.exports = getCollections;