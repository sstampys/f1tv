const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  
  // At top (before scroll)
  const before = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tbody tr")];
    return rows.filter(r => r.classList.contains("is-in")).length;
  });
  console.log("At top (before scroll):", before);
  
  // Scroll down in steps and sample
  for (let y = 0; y <= 2000; y += 300) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    const sample = await page.evaluate(() => {
      return [...document.querySelectorAll("tbody tr")].filter(r => r.classList.contains("is-in")).length;
    });
    console.log(`scrollY=${y}: rows revealed = ${sample}`);
  }
  
  // After scroll
  const after = await page.evaluate(() => {
    return [...document.querySelectorAll("tbody tr")].filter(r => r.classList.contains("is-in")).length;
  });
  console.log("After scroll:", after);
  
  await browser.close();
})();