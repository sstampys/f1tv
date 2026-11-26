const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Find the schedule table element
  const table = await page.evaluate(() => {
    return document.querySelector("table");
  });

  if (!table) {
    console.log("Schedule table not found");
    await browser.close();
    return;
  }

  // Walk up ancestors and log their computed styles
  const ancestors = [];
  let el = table;
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    ancestors.push({
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

  console.log("=== SCHEDULE TABLE AND ANCESTORS ===");
  ancestors.forEach((a, i) => {
    console.log(`[${i}] <${a.tag}> class="${a.cls}"`);
    console.log(`  overflow: ${a.overflow} | overflowY: ${a.overflowY} | overflowX: ${a.overflowX}`);
    console.log(`  maxHeight: ${a.maxHeight} | height: ${a.height}`);
  });

  await browser.close();
})();