const puppeteer = require('puppeteer');
const fs = require("fs");
const fastcsv = require('fast-csv');

async function scrapeMetacritic() {
    const browser = await puppeteer.launch({headless: false, defaultViewport: false});
    const page = await browser.newPage();
    let listPageData = []

    await page.goto('https://www.metacritic.com/search/game/the%20legend%20of%20zelda/results');
    page.on('console', msg => console.log(msg.text()));

    listPageData = await page.evaluate(() => {
        let results = []

        // the items collection will contain all thread elements
        let items = document.querySelectorAll('.search_results.module li')
        items.forEach((item) => {
            // the paging elements are also list items so we want to make sure we only include game results. 
            // These have a unique class name of .result which we can check by
            if (item.className.includes('result')) {
                let title = item.querySelector('.product_title.basic_stat').innerText;
                let metacriticScore = item.querySelector('.metascore_w').innerText;

                // click on the title hyperlink to go to the details page
                // await item.querySelector('.product_title.basic_stat a').click();
                let baseUrl = `https://www.metacritic.com`;
                const url = item.querySelector('.product_title.basic_stat a');
                let fullUrl = baseUrl + url.getAttribute('href');
      
                results.push({    
                    title: title,
                    metacriticScore: metacriticScore,
                    pageUrl: fullUrl
                })
            }    
        })
        return results
    });
    console.log(listPageData)

    // let's try to figure out how to add unique elements from the details page to our existing list of JSON object created (listpageData)
    // couldn't figure out a good way to navigate to detail pages in the forEach loop but was able to do so in this snippet.
    for(entry of listPageData) {
        let finalResults = [];
        console.log('try to go to new url here');
        let url = entry.pageUrl
        await page.evaluate((url)=>{window.location = url}, url);
        await page.waitFor('body > iframe');
        console.log('working!');
        
        // get the contents of the details page
        const itemDetails = await page.$('.module.product_data.product_data_summary');
        const userScore = await page.evaluate(el => el.querySelector('.metascore_w.user').innerText, itemDetails);
        const genre = await page.evaluate(el => el.querySelector('.summary_detail.product_genre').innerText, itemDetails);

        var matchingEntry = listPageData.filter(function(item) { return item.pageUrl === url; });

        if (matchingEntry.length > 0) {
            matchingEntry[0]['userScore'] = userScore;
            matchingEntry[0]['genre'] = genre;
        }
    }

    console.log('FINAL LIST DATA');
    console.log(listPageData);

    const ws = fs.createWriteStream("out.csv");
    fastcsv
        .write(listPageData, { headers: true })
        .pipe(ws);
    // await browser.close()
}

scrapeMetacritic();

