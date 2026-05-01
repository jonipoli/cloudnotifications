const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeAnnouncements() {
    console.log('Starting KTU Announcements Scraper...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Navigating to KTU Announcements page...');
        await page.goto('https://ktu.edu.in/Menu/announcements', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('Waiting for content to render...');
        await page.waitForSelector('.card', { timeout: 30000 });
        
        console.log('Extracting announcements...');
        const announcements = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('.card');
            
            cards.forEach(card => {
                const titleEl = card.querySelector('h6, h5, .card-title, strong');
                if (!titleEl) return;
                
                const title = titleEl.innerText.trim();
                
                const dateEl = card.querySelector('.text-danger, p.mb-1, span.text-muted');
                let date = dateEl ? dateEl.innerText.trim() : '';
                date = date.replace(/calendar_today/i, '').trim();
                
                const linkEl = card.querySelector('a.btn, a[href*="attachment"], a[href*=".pdf"]');
                let link = linkEl ? linkEl.getAttribute('href') : null;
                if (link && link.startsWith('/')) {
                    link = 'https://ktu.edu.in' + link;
                }
                
                const isNew = card.innerHTML.toLowerCase().includes('new');
                
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
