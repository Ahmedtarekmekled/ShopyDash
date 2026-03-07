/**
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string, options: LHCI.CollectCommand.Options}} context
 */
module.exports = async (browser, context) => {
  // Launch a new page to perform auth
  const page = await browser.newPage();
  
  try {
    // Navigate to the login page
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle0' });

    // Ensure email input exists and type credentials
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', 'zakiali@gmail.com');
    await page.type('input[type="password"]', 'testtest12@');

    // Submit form and wait for navigation (dashboard or home redirect)
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => console.log('Timeout waiting for auth navigation, but proceeding...'))
    ]);
  } catch (error) {
    console.error("Puppeteer login script failed:", error);
  } finally {
    await page.close();
  }
};
