import puppeteer from 'puppeteer';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'd:/Smart classroom/smartclass-frontend';

async function captureDashboard(role, email, password, filename) {
    console.log(`Checking ${role} Dashboard...`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    try {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
        await page.type('#email', email);
        await page.type('#password', password);
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(r => setTimeout(r, 3000)); // Wait for animations

        await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true });
        console.log(`Saved ${filename}`);
    } catch (err) {
        console.error(`Failed ${role}:`, err.message);
    } finally {
        await browser.close();
    }
}

(async () => {
    await captureDashboard('Teacher', 'teacher@example.com', 'pass', 'verify_teacher.png');
    await captureDashboard('Parent', 'parent@example.com', 'pass', 'verify_parent.png');
    await captureDashboard('Admin', 'admin@example.com', 'pass', 'verify_admin.png');
})();
