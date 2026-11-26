const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
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
      const maxHeight = cs.maxHeight;
      const height = cs.height;
      const hasScrollbar = hasVertical || hasHorizontal;
      
      // Report elements that have scrollbars or overflow != visible
      if (hasScrollbar || overflowY !== "visible" || overflowX !== "visible" || overflow !== "visible") {
        results.push({
          tag: el.tagName,
          cls: className.slice(0, 70),
          id: el.id,
          styleOverflow: overflow,
          styleOverflowY: overflowY,
          styleOverflowX: overflowX,
          maxHeight,
          height,
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

  console.log("=== ELEMENTS WITH SCROLLBARS OR NON-VISIBLE OVERFLOW ===");
  results.forEach((r, i) => {
    console.log(`\n[${i}] <${r.tag} class="${r.cls}" id="${r.id || ""}">`);
    console.log(`  overflow: ${r.styleOverflow} | overflowY: ${r.styleOverflowY} | overflowX: ${r.styleOverflowX}`);
    console.log(`  maxHeight: ${r.maxHeight} | height: ${r.height}`);
    console.log(`  scrollW/clientW: ${r.scrollWidth}/${r.clientWidth} | scrollH/clientH: ${r.scrollHeight}/${r.clientHeight}`);
    console.log(`  hasVerticalScrollbar: ${r.hasVerticalScrollbar} | hasHorizontalScrollbar: ${r.hasHorizontalScrollbar}`);
    console.log(`  text: "${r.textSnippet}"`);
    console.log(`  rect: top=${r.rect.t} bottom=${r.rect.b} left=${r.rect.l} right=${r.rect.r}`);
  });
  console.log(`\nTotal elements with scroll/overflow issues: ${results.length}`);

  // Check html/body overflow
  const bodyInfo = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const hcs = getComputedStyle(html);
    const bcs = getComputedStyle(body);
    return {
      html: { overflow: hcs.overflow, overflowY: hcs.overflowY, overflowX: hcs.overflowX, height: hcs.height },
      body: { overflow: bcs.overflow, overflowY: bcs.overflowY, overflowX: bcs.overflowX, height: bcs.height },
      scrollElement: document.scrollingElement ? document.scrollingElement.tagName : null
    };
  });

  console.log("\n=== HTML/BODY ===");
  console.log(JSON.stringify(bodyInfo, null, 2));

  await browser.close();
})();
