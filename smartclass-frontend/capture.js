import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    console.log('Typing credentials for admin...');
    await page.type('#email', 'admin@example.com');
    await page.type('#password', 'pass');
    await page.click('button[type="submit"]');

    console.log('Waiting for admin dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => { });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Logging out...');
    // Click logout (assuming role-based routing redirect)
    await page.evaluate(() => localStorage.clear());

    console.log('Navigating to login again...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    console.log('Typing credentials for parent...');
    await page.type('#email', 'parent@example.com');
    await page.type('#password', 'pass');
    await page.click('button[type="submit"]');

    console.log('Waiting for parent dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => { });
    await new Promise(r => setTimeout(r, 2000));

    await browser.close();
})();
