const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Test all 5 pages
  const pages = [
    { path: "/", name: "home" },
    { path: "/standings", name: "standings" },
    { path: "/schedule", name: "schedule" },
    { path: "/legal", name: "legal" },
    { path: "/demo", name: "demo" }
  ];
  
  for (const page of pages) {
    await page.goto(`https://f1box.org${page.path}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    
    // Check for horizontal scroll
    const hasHScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    // Check for inner scroll containers (scrollHeight > clientHeight with overflow)
    const hasInnerScroll = await page.evaluate(() => {
      const scrollers = [];
      document.querySelectorAll("*").forEach(el => {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 5) {
          scrollers.push(el);
        }
      });
      return scrollers.length > 0;
    });
    
    // Check if Wins column is visible
    const winsVisible = await page.evaluate(() => {
      const winsHeader = document.querySelector("th[aria-label='Wins'], th:last-child");
      if (!winsHeader) return false;
      const rect = winsHeader.getBoundingClientRect();
      return rect.width > 0 && rect.right <= window.innerWidth;
    });
    
    console.log(`✅ ${page.name}:`);
    console.log(`  • No inner scroll containers: ${!scrollers.length}`);
    console.log(`  • No horizontal scroll: ${!hasHScroll}`);
    console.log(`  • Wins column visible: ${winsVisible}`);
  }
  
  await browser.close();
})();