const puppeteer = require('puppeteer-extra');
const {
    executablePath
} = require('puppeteer')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(stealthPlugin())
const fs = require('fs');
const path = require('path');
const { TIMEOUT } = require('dns');
let stops = false

const mainProccess = async (logToTextArea, proggress, data) => {
    const baseURL = 'https://chat.openai.com/'; 
    const browser = await puppeteer.launch({
        executablePath: executablePath(),
        headless: data.visible,
        defaultViewport: null,
    })

    const page = await browser.newPage()
    page.sleep = function (timeout) {
        return new Promise(function (resolve) {
            setTimeout(resolve, timeout)
        })
    }

    async function delay(seconds) {
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    const loadCookies = async () => {
        try {
            logToTextArea('Load Cookies')
    
            const cookiesData = fs.readFileSync(data.cookies, 'utf8')
            const cookies = JSON.parse(cookiesData)
            
            await page.goto(baseURL, {
                waitUntil: ['domcontentloaded', 'networkidle2'],
                timeout: 120000,
            })
            
            await page.setCookie(...cookies)
            logToTextArea('Done Load Cookies')
    
            await delay(10)
    
            //Refresh the page to apply the cookies
            await page.goto(baseURL, {
                waitUntil: ['domcontentloaded', 'networkidle2'],
                timeout: 120000,
            })
    
        } catch (error) {
            logToTextArea(error)
            throw error
        }
    }

    const coreProccess = async (keyword) => {
        await page.waitForSelector('#prompt-textarea', {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 120000,
        })

        logToTextArea('Create a Title in ChatGPT')
        const writeGPT = await page.$('#prompt-textarea');
        await writeGPT.type('create one title maximal 60 characters about ' + keyword + ' and remove the quotation mark at the beginning and end of the title');

        await delay(2)

        try {
            await page.click('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button')

        } catch (error) {
            console.log(error);
        }

        await delay(4)

        const articleTitle = await page.evaluate(() => {
            const titleElement = document.querySelector('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div:nth-child(3) > div > div > div.relative.flex.w-full.flex-col.lg\\:w-\\[calc\\(100\\%-115px\\)\\].agent-turn > div.flex-col.gap-1.md\\:gap-3 > div.flex.flex-grow.flex-col.max-w-full > div > div > p');
            return titleElement.innerHTML;
        })

        await page.sleep(3000)

        logToTextArea('Enter the Wordpress Page')
        const targetWordpress = (`https://${data.dom}/wp-admin/post-new.php`)
        const page2 = await browser.newPage()
        await page2.goto(targetWordpress)

        await delay(2)

        await page2.waitForSelector('title')
        await page2.click('#title')
        await delay(2)

        logToTextArea('Paste Title in Wordpress')
        const titleWP = await page2.$eval('#title', (textarea, value) => {
            textarea.value = value
        }, articleTitle)

        await delay(3)

        logToTextArea('Enter the Google Image Page')
        const googleImage = ('https://www.google.com/imghp?hl=en&ogbl')
        const page3 = await browser.newPage();
        await page3.goto(googleImage)

        await page3.waitForSelector('[name="q"]')
        await page3.type('[name="q"]', keyword)

        await page3.keyboard.press('Enter')

        await delay(3)

        logToTextArea('Search for Random Images in Google Image')
        await page3.waitForSelector('.rg_i', {timeout: 120000})
        const imageSelector = await page3.$$('.rg_i');
        const randomImage = Math.floor(Math.random() * imageSelector.length, {
            delay: 2000
        })
        await imageSelector[randomImage].click();

        logToTextArea('Copy Random Image URL')
        await page3.waitForSelector('#Sva75c > div.A8mJGd.NDuZHe.CMiV2d.OGftbe-N7Eqid-H9tDt > div.dFMRD > div.AQyBn > div.tvh9oe.BIB1wf.hVa2Fd > c-wiz > div > div > div > div > div.v6bUne > div.p7sI2.PUxBg > a > img.sFlh5c.pT0Scc.iPVvYb', {timeout: 75000})
        const imageURL = await page3.evaluate(() => {
            const imageElement = document.querySelector("#Sva75c > div.A8mJGd.NDuZHe.CMiV2d.OGftbe-N7Eqid-H9tDt > div.dFMRD > div.AQyBn > div.tvh9oe.BIB1wf.hVa2Fd > c-wiz > div > div > div > div > div.v6bUne > div.p7sI2.PUxBg > a > img.sFlh5c.pT0Scc.iPVvYb")
            return imageElement.src
        })

        const tagIMG = await page3.evaluate((imageURL) => {
            const imageTag = `<img class="aligncenter" src="${imageURL}"/>`
            return imageTag
        }, imageURL)

        await page3.bringToFront()
        await page2.bringToFront()

        await delay(2)

        const buttonText = await page2.$('#content-html')
        await buttonText.click()

        await page2.waitForSelector('#content')

        await delay(2)

        logToTextArea('Paste Image URL in Featured Image Wordpress')
        await page2.waitForSelector('#fifu_input_url')
        await page2.click('#fifu_input_url')
        await page2.$eval('#fifu_input_url', (textarea, value) => {
            textarea.value = value
        }, imageURL)

        await delay(3)

        await page2.bringToFront()
        await page.bringToFront()

        await delay(2)

        logToTextArea('Create a Article in ChatGPT')
        await writeGPT.type('create an article with minimum 600 words from title above without displaying the article title. Article using tag paragraph and add a sub heading for each paragraph. Add ' + keyword + ' as a link in the middle of article sentence of the article result with this url ' + data.dom);

        await delay(2)

        try {
            await page.click('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button')
            await delay(10)
        } catch (error) {
            console.log(error);
        }

        await page.waitForSelector('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button', {
            timeout: 120000
        })

        const articleTextBody = await extractArticle(page, notOuter = false)
        articleTextBody.unshift('<div class="markdown prose w-full break-words dark:prose-invert light" style="text-align: justify;">');
        articleTextBody.unshift('<br>')
        articleTextBody.push("</div>");

        await page.bringToFront()
        await page2.bringToFront()

        await delay(2)

        await page2.click('#content')
        articleTextBody.unshift(tagIMG)

        logToTextArea('Paste Image and Article from ChatGPT in Wordpress Body Text')
        await page2.$eval('#content', (textarea, value) => {
            textarea.value = value.join('');
        }, articleTextBody);

        await delay(2)

        logToTextArea('Cek Gambar dan Artikel di Body Visual Wordpress')
        await page2.waitForSelector('#content-tmce')
        const visualButton = await page2.$('#content-tmce')
        await visualButton.click()

        await delay(3)
        
        logToTextArea('Remove Site Title and Separator in Wordpress Post Title')
        await page2.waitForSelector('#aioseo-post-settings-post-title-row > div.aioseo-col.col-xs-12.col-md-9.text-xs-left > div > div.aioseo-html-tags-editor > div.aioseo-editor > div.aioseo-editor-single.ql-container.ql-snow > div.ql-editor > p')
        const clearPostTitle = await page2.$('#aioseo-post-settings-post-title-row > div.aioseo-col.col-xs-12.col-md-9.text-xs-left > div > div.aioseo-html-tags-editor > div.aioseo-editor > div.aioseo-editor-single.ql-container.ql-snow > div.ql-editor > p')
        await clearPostTitle.click()
        for (let i = 0; i < 4; i++) {
            await page2.keyboard.press('Backspace')
        }
        
        await delay(2)
        
        // Menghapus Post Excerpt
        logToTextArea('Remove Post Excerpt in Wordpress Meta Description')
        const selectorMeta = "#aioseo-post-settings-meta-description-row > div.aioseo-col.col-xs-12.col-md-9.text-xs-left > div > div.aioseo-html-tags-editor > div.aioseo-editor > div.aioseo-editor-description.ql-container.ql-snow > div.ql-editor > p"
        await page2.waitForSelector(selectorMeta)
        const clearMetaDesc = await page2.$(selectorMeta)
        await clearMetaDesc.click()
        for (let i = 0; i < 2; i++) {
            await page2.keyboard.press('Backspace')
        }

        await delay(3)

        await page2.bringToFront()
        await page.bringToFront()

        logToTextArea('Create a Meta Description in ChatGPT')
        await writeGPT.type('Create meta tag 160 characters but not html code version and add the title above in the first and remove the quotation mark at the beginning and the end');
        try {
            await page.click('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button')
            await delay(10)
        } catch (error) {
            console.log(error);
        }

        await page.waitForSelector('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button', {
            timeout: 120000
        })

        const metaTag = await extractArticle(page, notOuter = true)

        await page.bringToFront()
        await page2.bringToFront()

        logToTextArea('Paste Meta Description in Wordpress')
        await page2.waitForSelector(selectorMeta)
        const metaField = await page2.$(selectorMeta)
        await metaField.type(metaTag)

        await delay(3)

        logToTextArea('Select Random Category in Wordpress')
        const checkboxes = await page2.$$('[name="post_category[]"]');
        const randomIndex = Math.floor(Math.random() * checkboxes.length);
        await checkboxes[randomIndex].evaluate((e) => e.click());

        await delay(3)

        await page2.bringToFront()
        await page.bringToFront()

        logToTextArea('Create Tags in ChatGPT')
        await writeGPT.type(`Create 10 consecutive tags using commas from the ${keyword} keyword`)
        try {
            await page.click('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div.relative.flex.h-full.max-w-full.flex-1.flex-col.overflow-hidden > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button')
            await delay(10)
        } catch (error) {
            console.log(error);
        }

        await page.waitForSelector('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div > main > div.flex.h-full.flex-col > div.w-full.pt-2.md\\:pt-0.dark\\:border-white\\/20.md\\:border-transparent.md\\:dark\\:border-transparent.md\\:w-\\[calc\\(100\\%-\\.5rem\\)\\] > form > div > div > div > button', {
            timeout: 120000
        })

        const tagsField = await extractArticle(page, notOuter = true)

        await page.bringToFront()
        await page2.bringToFront()

        logToTextArea('Paste Tags from ChatGPT in Wordpress')
        const selectorTags = ('#new-tag-post_tag')
        const tagsWP = await page2.$(selectorTags)
        await tagsWP.click()
        await tagsWP.type(tagsField)

        await delay(3)

        logToTextArea('Click Add Tags Button')
        const addTags = await page2.$('#post_tag > div > div.ajaxtag.hide-if-no-js > input.button.tagadd')
        await addTags.click()
        
        await delay(5)
        
        logToTextArea('Click Save Post Button')
        await page2.waitForSelector('#save-post')
        await page2.evaluate(() => {
            document.getElementById("save-post").click()
        })

        await delay(15)
        
        logToTextArea('Click Add New Post Button')
        const addNew = await page2.$('#wpbody-content > div.wrap > a')
        await addNew.click()
        
        logToTextArea('Close Google Image Page and Wordpress Page')
        await page3.close()
        await page2.close()
    }

    const extractArticle = async (notOuter) => {
        let article = [];
    
        const data = await page.$$('#__next > div.relative.z-0.flex.h-full.w-full.overflow-hidden > div > main > div.flex.h-full.flex-col > div.flex-1.overflow-hidden > div > div > div > div > div > div > div.relative.flex.w-full.flex-col.lg\\:w-\\[calc\\(100\\%-115px\\)\\].agent-turn > div.flex-col.gap-1.md\\:gap-3 > div.flex.flex-grow.flex-col.max-w-full > div > div');
    
        if (data.length > 0) {
            const last = data[data.length - 1];
    
            const paragraphs = await last.$$('p');
            for (const paragraph of paragraphs) {
                const data = await page.evaluate((el, notOuter) => notOuter ? el.innerHTML : el.outerHTML, paragraph, notOuter);
                article.push(data);
            }
        }
    
        return article;
    };
    
    const workFlow = async (stops) => {
        try {
            const files = fs.readFileSync(data.files, 'utf-8').split('\n')
    
            for (let i = 0; i < files.length; i++) {
                let keyword = files[i].trim();
    
                await coreProccess(keyword)
                const countProggress = parseInt(((i + 1) / files.length) * 100)
                proggress(countProggress)
                if (stops) {
                    break;
                }
            }

            await browser.close()
        } catch (error) {
            logToTextArea(error)
        }
    }

    await loadCookies()
    await workFlow(stops)
}

const stopProccess = async () => {
    stops = true
}

module.exports = {
    mainProccess,
    stopProccess
}