const puppeteer = require('puppeteer');
const fs = require("fs");
const fastcsv = require('fast-csv');

async function scrapeMetacritic() {
    const browser = await puppeteer.launch({headless: false, defaultViewport: false});
    const page = await browser.newPage();
    let listPageData = []

    await page.goto('https://www.metacritic.com/search/game/the%20legend%20of%20zelda/results', {waitUntil: "load"});
    // await page.goto('https://www.metacritic.com/search/game/the%20legend%20of%20zelda/results?page=5', {waitUntil: "load"});
    
    page.on('console', msg => console.log(msg.text()));

    // selector when next button enabled
    // #main_content > div > div.module.search_results.fxdcol.gu6 > div > div > span.flipper.next > a > span

    // selector when next button disabled
    // #main_content > div > div.module.search_results.fxdcol.gu6 > div > div > span.flipper.next > span > span

    // find the html element for the next button
    let nextButtonElement = await page.$('span.flipper.next > a > span');
    let nextButtonVisible = await page.$('span.flipper.next > a > span') !== null;
    console.log('next button element');
    console.log(nextButtonElement);

    console.log('next button visible');
    console.log(nextButtonVisible)

    let isNextButtonPresent = true;


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

    // let's try to figure out how to add unique elements from the details page to our existing list of JSON object created (listpageData)
    // couldn't figure out a good way to navigate to detail pages in the forEach loop but was able to do so in this snippet.
    for(entry of listPageData) {
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

