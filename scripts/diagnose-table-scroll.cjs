const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  const ancestors = await page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return null;
    const arr = [];
    let el = table;
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      arr.push({
        tag: el.tagName,
        cls: el.className,
        overflow: cs.overflow,
        overflowY: cs.overflowY,
        overflowX: cs.overflowX,
        maxHeight: cs.maxHeight,
        height: cs.height,
      });
      el = el.parentElement;
    }
    return arr;
  });

  if (!ancestors) {
    console.log("Table not found");
    await browser.close();
    return;
  }

  console.log("=== TABLE AND ANCESTORS ===");
  ancestors.forEach((a, i) => {
    console.log(`[${i}] <${a.tag}> class="${a.cls}"`);
    console.log(`  overflow: ${a.overflow} | overflowY: ${a.overflowY} | overflowX: ${a.overflowX}`);
    console.log(`  maxHeight: ${a.maxHeight} | height: ${a.height}`);
  });

  await browser.close();
})();
