const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Check horizontal page scroll
  const hasHScroll = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth;
  });
  console.log("Horizontal page scroll exists:", hasHScroll);

  // Check Wins column visibility at 375px
  const winsVisible = await page.evaluate(() => {
    const winsHeader = document.querySelector("th[aria-label='Wins'], th:last-child");
    if (!winsHeader) return { visible: false, found: false };
    const rect = winsHeader.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.right <= window.innerWidth;
    return { visible: isVisible, width: Math.round(rect.width), right: Math.round(rect.right) };
  });

  console.log("Wins column at 375px:", JSON.stringify(winsVisible));

  // Check table width vs viewport
  const tableWidth = await page.evaluate(() => {
    const table = document.querySelector("table");
    return table?.clientWidth || 0;
  });
  console.log("Table width:", tableWidth, "vs viewport:", window.innerWidth);

  await browser.close();
})();