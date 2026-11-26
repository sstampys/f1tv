const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  for (const vp of [
    { width: 1440, height: 900, name: "1440" },
    { width: 375, height: 900, name: "375" },
  ]) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/tmp/standings-${vp.name}.png`, fullPage: false });
    console.log(`Saved /tmp/standings-${vp.name}.png`);
    await context.close();
  }
  await browser.close();
})();
