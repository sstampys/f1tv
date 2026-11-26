const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Check if Wins column is visible at 375px
  const winsVisible = await page.evaluate(() => {
    const winsColumn = document.querySelector("th[aria-label='Wins'], td[aria-label='Wins'], span:has-text('Wins')");
    if (!winsColumn) return { visible: false, element: null };
    
    const rect = winsColumn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isVisible = rect.width > 0 && rect.right <= viewportWidth;
    
    return { 
      visible: isVisible,
      element: winsColumn.tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
    };
  });

  console.log("Wins column at 375px:", winsVisible);
  
  // Check if the table fits within viewport width
  const tableWidth = await page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return 0;
    return table.clientWidth;
  });
  
  const viewportWidth = 375;
  const tableFits = tableWidth <= viewportWidth;
  
  console.log(`Table width: ${tableWidth}px | Viewport: ${viewportWidth}px | Fits: ${tableFits}`);
  
  await browser.close();
})();