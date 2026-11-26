const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Test constructor tab
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  
  // Click constructors tab
  await page.click("button[role='tab']:has-text('Constructors')");
  await page.waitForTimeout(1500);
  
  const constructorCheck = await page.evaluate(() => {
    const table = document.querySelector("table");
    const rows = document.querySelectorAll("tbody tr");
    const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const winsHeader = document.querySelector("thead th:last-child");
    const winsRect = winsHeader ? winsHeader.getBoundingClientRect() : null;
    const revealed = [...rows].filter(r => r.classList.contains("is-in")).length;
    return {
      hasHScroll,
      tableWidth: table?.clientWidth || 0,
      viewportWidth: window.innerWidth,
      rowCount: rows.length,
      revealed,
      winsRight: winsRect ? Math.round(winsRect.right) : null,
    };
  });
  console.log("Constructor tab:", JSON.stringify(constructorCheck, null, 2));
  
  // Test schedule page
  await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  
  const scheduleCheck = await page.evaluate(() => {
    const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    // Check for nested scroll containers (scrollHeight > clientHeight with overflow != visible)
    const scrollers = [];
    document.querySelectorAll("*").forEach(el => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 5) {
        scrollers.push({
          tag: el.tagName,
          cls: (el.className || "").slice(0, 50),
          overflowY: cs.overflowY,
          scrollH: el.scrollHeight,
          clientH: el.clientHeight,
        });
      }
    });
    return { hasHScroll, nestedScrollers: scrollers };
  });
  console.log("Schedule page:", JSON.stringify(scheduleCheck, null, 2));
  
  await browser.close();
})();
