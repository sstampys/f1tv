const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Find empty pill-like elements
  const emptyPills = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const text = (el.textContent || "").trim();
      // Check for pill-like elements with no text
      if (r.width > 100 && r.height > 30 && r.top < 200 && text.length === 0 &&
          (cs.borderRadius === "999px" || cs.borderRadius.includes("999"))) {
        results.push({
          tag: el.tagName,
          cls: el.className,
          rect: { t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
          borderRadius: cs.borderRadius,
          border: cs.borderWidth + " " + cs.borderStyle + " " + cs.borderColor,
          background: cs.backgroundColor,
        });
      }
    });
    return results;
  });

  console.log("Empty pill-like elements:", JSON.stringify(emptyPills, null, 2));

  // Check tab panels for any empty containers
  const tabPanels = await page.evaluate(() => {
    const panels = document.querySelectorAll("[role=\"tabpanel\"]");
    return Array.from(panels).map(p => ({
      cls: p.className,
      children: p.children.length,
      text: (p.textContent || "").trim().slice(0, 50),
      rect: { ...p.getBoundingClientRect() },
    }));
  });
  console.log("Tab panels:", JSON.stringify(tabPanels, null, 2));

  await browser.close();
})();
