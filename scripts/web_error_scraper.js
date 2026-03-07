const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8082');
  // Wait for error banner
  await page.waitForSelector('div[style*="background-color: rgb(255, 77, 109)"]', { timeout: 5000 }).catch(() => {});
  const errorText = await page.evaluate(() => document.body.innerText);
  console.log('--- WEB ERROR ---\n', errorText);
  await browser.close();
})();
