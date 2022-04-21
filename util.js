const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const variablePath = "./variables.json";
const variable = require(variablePath);

class Ulti {

  alertScreen(msg) {
    console.log("=> " + msg);
  }

  getLargestSrc(srcset) {
    const splitedSrcset = srcset.split(",");
    const largestSrc = splitedSrcset[splitedSrcset.length - 1].trim().split(" ")[0];

    return largestSrc;
  }

  isValidUrl(url) {
    const expr = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g;
    const match = expr.exec(url);

    if (match) {
      return true;
    }
    return false;
  }

  escape(str) {
    return str.replace(/([\/\"\'])/g, "\$1");
  }

  updateData(obj) {
    if ("currentDemoIndex" in obj || "currentCollection" in obj || "currentProduct" in obj || "currentPage" in obj) {
      const data = Object.assign(variable, obj);
      fs.writeFileSync(variablePath, JSON.stringify(data));
    }
  }

  async createFolder(folderPath) {
    try {
      const filePath = path.join(__dirname, folderPath);
      if (!fs.existsSync(filePath))
        await fs.mkdirSync(filePath);
    } catch (error) {
      console.log(error);
    }
  }

  async travelArray(index, array, callback) {
    if (index === array.length)
      return false;
    await callback(index, array[index], callback, this.travelArray);
  }

  async init() {
    const browser = await puppeteer.launch({
      headless: true
    });
    this.page = await browser.newPage();
    this.page.setViewport({
      width: 1920,
      height: 1080
    });
  }


  async goTo(url, scroll = true) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        await self.page.goto(url, {
          waitUntil: "networkidle2"
        });
        if (scroll)
          await self.autoScroll();
        resolve(self.page);
      } catch (error) {
        reject(error);
      }
    })
  }

  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const distance = 100;
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}


module.exports = new Ulti();