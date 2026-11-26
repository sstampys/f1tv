const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Find elements with border-radius and border, near the top of the page, that are empty
  const outlines = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      // Near top of viewport
      if (rect.top < 400 && rect.width > 100 && rect.height > 30) {
        const hasRadius = parseFloat(cs.borderRadius) > 4;
        const hasBorder = cs.borderWidth !== "0px" && cs.borderStyle !== "none";
        const text = (el.textContent || "").trim();
        if (hasRadius && (hasBorder || cs.outlineWidth !== "0px")) {
          results.push({
            tag: el.tagName,
            cls: el.className?.slice?.(0, 80) || el.className,
            text: text.slice(0, 40),
            borderRadius: cs.borderRadius,
            border: cs.borderWidth + " " + cs.borderStyle + " " + cs.borderColor,
            rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
          });
        }
      }
    });
    return results;
  });

  console.log("Elements with rounded borders near top:");
  console.log(JSON.stringify(outlines, null, 2));

  await browser.close();
})();
