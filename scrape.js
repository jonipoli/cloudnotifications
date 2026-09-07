const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function isBTechRelevant(title) {
    if (!title) return false;
    const t = title.toLowerCase();
    if (t.includes('b.tech') || t.includes('btech') || t.includes('b. tech') || /\bb[\s.]*tech\b/i.test(t)) return true;
    
    const nonBTech = [
        /\bm[\s.]*tech\b/i,
        /\bb[\s.]*arch\b/i,
        /\bm[\s.]*arch\b/i,
        /\bmca\b/i,
        /\bmba\b/i,
        /\bb[\s.]*des\b/i,
        /\bm[\s.]*des\b/i,
        /\bph[\s.]*d\b/i,
        /\bm[\s.]*plan\b/i,
        /\bb[\s.]*plan\b/i,
        /\bpg-valuation\b/i,
        /\bvaluation\s*\(pg\)/i
    ];
    
    return !nonBTech.some(regex => regex.test(t));
}

async function scrapeAnnouncements() {
    console.log('Starting KTU Announcements Scraper...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Navigating to KTU Announcements page...');
        await page.goto('https://ktu.edu.in/Menu/announcements', { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        const title = await page.title();
        console.log(`Page Title: ${title}`);

        console.log('Waiting for content to render...');
        try {
            await page.waitForSelector('h6.f-w-bold', { timeout: 45000 });
        } catch (e) {
            console.log('Warning: h6.f-w-bold selector timed out. Checking for alternative content...');
            const content = await page.content();
            if (content.includes('Announcements')) {
                console.log('Page seems to have loaded despite selector timeout.');
            } else {
                throw new Error('Page failed to load correctly.');
            }
        }
        
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('Extracting announcements from Page 1...');
        const allAnnouncements = [];
        
        for (let p = 1; p <= 5; p++) {
            console.log(`Scraping Page ${p}...`);
            const pageData = await page.evaluate(() => {
                const results = [];
                const titles = document.querySelectorAll('h6.f-w-bold');
                
                titles.forEach(titleEl => {
                    const title = titleEl.innerText.trim();
                    const container = titleEl.closest('.row');
                    if (!container) return;
                    
                    const dateEl = container.querySelector('.fa-calendar')?.parentElement;
                    const date = dateEl ? dateEl.innerText.trim() : '';
                    const link = 'https://ktu.edu.in/Menu/announcements';
                    const isNew = container.innerHTML.toLowerCase().includes('new');
                    
                    if (title && !title.includes('Quick Links') && !title.includes('Contact')) {
                        results.push({ title, date, link, isNew });
                    }
                });
                return results;
            });
            
            allAnnouncements.push(...pageData);
            
            if (p < 5) {
                const nextButton = await page.$("a[aria-label='Next page']");
                if (nextButton) {
                    const firstTitleBefore = await page.evaluate(() => document.querySelector('h6.f-w-bold')?.innerText);
                    console.log('Clicking Next page...');
                    await nextButton.click();
                    await page.waitForFunction(
                        (oldTitle) => document.querySelector('h6.f-w-bold')?.innerText !== oldTitle,
                        { timeout: 20000 },
                        firstTitleBefore
                    );
                    await new Promise(r => setTimeout(r, 3000));
                } else {
                    console.log('Next button not found. Ending scrape.');
                    break;
                }
            }
        }
        
        const btechAnnouncements = allAnnouncements.filter(item => isBTechRelevant(item.title));
        console.log(`Total announcements scraped: ${allAnnouncements.length} | Kept B.Tech: ${btechAnnouncements.length}`);
        const outputPath = path.join(__dirname, 'announcements.json');
        fs.writeFileSync(outputPath, JSON.stringify(btechAnnouncements, null, 2));
        console.log(`Successfully saved ${btechAnnouncements.length} B.Tech announcements to ${outputPath}`);
        
    } catch (error) {
        console.error('Error scraping announcements:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

scrapeAnnouncements();
