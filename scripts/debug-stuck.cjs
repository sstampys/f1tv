const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);

  const stuck = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const isInViewport = r.top < window.innerHeight && r.bottom > 0;
      if (isInViewport && cs.opacity === "0") {
        results.push({
          tag: el.tagName,
          cls: el.className?.toString().slice(0, 60),
          text: (el.textContent || "").trim().slice(0, 40),
          opacity: cs.opacity,
          top: Math.round(r.top + window.scrollY),
          bottom: Math.round(r.bottom + window.scrollY),
          height: Math.round(r.height),
        });
      }
    });
    return results;
  });

  console.log(JSON.stringify(stuck, null, 2));
  await browser.close();
})();
