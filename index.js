const puppeteer = require('puppeteer');
const fs = require("fs");
const fastcsv = require('fast-csv');

async function scrapeMetacritic() {
    const browser = await puppeteer.launch({headless: false, defaultViewport: false});
    const page = await browser.newPage();
    let listPageData = []

    await page.goto('https://www.metacritic.com/search/game/the%20legend%20of%20zelda/results', {waitUntil: "load"});

    let nextButtonVisible = await page.$('span.flipper.next > a > span') !== null;

    while (nextButtonVisible) {
        await page.waitForSelector('.search_results.module > .result.first_result');

        const gameResults = await page.$$('.search_results.module > .result');

        for(const gameResult of gameResults) {
            const title = await page.evaluate(el => el.querySelector('.product_title.basic_stat > a').textContent, gameResult);
            const metacriticScore = await page.evaluate(el => el.querySelector('.metascore_w').textContent, gameResult);
            const url = await page.evaluate(el => el.querySelector('.product_title.basic_stat a[href]').href, gameResult);
    
            listPageData.push({
                title: title.trim(),
                metacriticScore: metacriticScore.trim(),
                pageUrl: url.trim()
            })
        }
        
        if (await page.$('span.flipper.next > a > span') !== null) {
            await page.waitForSelector('span.flipper.next > a > span');
            await page.click('span.flipper.next > a > span');
        } else {
            nextButtonVisible = false;
        }   
    }

    // let's try to figure out how to add unique elements from the details page to our existing list of JSON object created (listpageData)
    // couldn't figure out a good way to navigate to detail pages in the previous loop but was able to do so in this snippet.
    for(entry of listPageData) {
        let url = entry.pageUrl
        await page.evaluate((url)=>{window.location = url}, url);
        await page.waitForSelector('body > iframe');

        let userScore = null;
        
        // get the contents of the details page
        const itemDetails = await page.$('.module.product_data.product_data_summary');

        try {
            userScore = await page.evaluate(el => el.querySelector('.metascore_w.user').innerText, itemDetails);
        } catch(error) {}
        
        const genre = await page.evaluate(el => el.querySelector('.summary_detail.product_genre').innerText, itemDetails);

        var matchingEntry = listPageData.filter(function(item) { return item.pageUrl === url; });

        if (matchingEntry.length > 0) {
            matchingEntry[0]['userScore'] = userScore;
            matchingEntry[0]['genre'] = genre;
        }
    }

    const ws = fs.createWriteStream("out.csv");
    fastcsv
        .write(listPageData, { headers: true })
        .pipe(ws);
    await browser.close();
    console.log('Web Scraping Complete');
}

scrapeMetacritic();

