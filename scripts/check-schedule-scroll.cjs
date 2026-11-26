const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Find ALL elements with scrollbars or non-visible overflow
  const results = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("*").forEach((el) => {
      const className = el.getAttribute("class") || "";
      const cs = getComputedStyle(el);
      const sw = el.scrollWidth, cw = el.clientWidth;
      const sh = el.scrollHeight, ch = el.clientHeight;
      const hasVertical = sh > ch;
      const hasHorizontal = sw > cw;
      const overflowY = cs.overflowY;
      const overflowX = cs.overflowX;
      const overflow = cs.overflow;
      const hasScrollbar = hasVertical || hasHorizontal;
      if (hasScrollbar || overflowY !== "visible" || overflowX !== "visible" || overflow !== "visible") {
        results.push({
          tag: el.tagName,
          cls: className.slice(0, 70),
          id: el.id,
          styleOverflow: overflow,
          styleOverflowY: overflowY,
          styleOverflowX: overflowX,
          maxHeight: cs.maxHeight,
          height: cs.height,
          scrollWidth: Math.round(sw),
          clientWidth: Math.round(cw),
          scrollHeight: Math.round(sh),
          clientHeight: Math.round(ch),
          hasVerticalScrollbar: hasVertical,
          hasHorizontalScrollbar: hasHorizontal,
          textSnippet: (el.textContent || "").trim().slice(0, 40),
          rect: { t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), l: Math.round(el.getBoundingClientRect().left), r: Math.round(el.getBoundingClientRect().right) }
        });
      }
    });
    return results;
  });

  console.log("=== ELEMENTS WITH SCROLLBARS OR NON-VISIBLE OVERFLOW (SCHEDULE) ===");
  results.forEach((r, i) => {
    console.log(`\n[${i}] <${r.tag} class="${r.cls}" id="${r.id || ""}">`);
    console.log(`  overflow: ${r.styleOverflow} | overflowY: ${r.styleOverflowY} | overflowX: ${r.styleOverflowX}`);
    console.log(`  scrollW/clientW: ${r.scrollWidth}/${r.clientWidth} | scrollH/clientH: ${r.scrollHeight}/${r.clientHeight}`);
    console.log(`  hasVerticalScrollbar: ${r.hasVerticalScrollbar} | hasHorizontalScrollbar: ${r.hasHorizontalScrollbar}`);
    console.log(`  text: "${r.textSnippet}"`);
    console.log(`  rect: top=${r.rect.t} bottom=${r.rect.b} left=${r.rect.l} right=${r.rect.r}`);
  });
  console.log(`\nTotal elements with scroll/overflow issues: ${results.length}`);

  await browser.close();
})();