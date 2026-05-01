const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
        await page.goto('https://ktu.edu.in/Menu/announcements', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('Waiting for content to render...');
        await page.waitForSelector('h6.f-w-bold', { timeout: 30000 });
        
        // Give it a few extra seconds for React to finish rendering all items
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('Extracting announcements...');
        const announcements = await page.evaluate(() => {
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
        
        console.log(`Found ${announcements.length} announcements.`);
        
        const outputPath = path.join(__dirname, 'announcements.json');
        fs.writeFileSync(outputPath, JSON.stringify(announcements, null, 2));
        console.log(`Successfully saved announcements to ${outputPath}`);
        
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
