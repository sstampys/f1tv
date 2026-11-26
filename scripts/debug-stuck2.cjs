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

  // Scroll to bottom and see if element becomes visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  const afterScroll = await page.evaluate(() => {
    const el = [...document.querySelectorAll("[data-reveal]")].find((e) =>
      (e.textContent || "").includes("Autódromo José Carlos Pace")
    );
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { found: true, opacity: cs.opacity, top: r.top, bottom: r.bottom };
  });

  console.log("After scroll:", JSON.stringify(afterScroll));

  // Scroll back to top and check
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);

  const afterScrollTop = await page.evaluate(() => {
    const el = [...document.querySelectorAll("[data-reveal]")].find((e) =>
      (e.textContent || "").includes("Autódromo José Carlos Pace")
    );
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { found: true, opacity: cs.opacity, top: r.top, bottom: r.bottom };
  });

  console.log("After scroll to top:", JSON.stringify(afterScrollTop));
  await browser.close();
})();
