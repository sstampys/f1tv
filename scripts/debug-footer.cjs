const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/legal", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1000);

  // Scroll slowly to bottom in small steps
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log("Total height:", totalHeight);

  for (let y = 0; y < totalHeight; y += 100) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1500); // let observer fire

  const footerState = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".quiet-footer p")];
    return p.map((p) => {
      const cs = getComputedStyle(p);
      const a = p.querySelector("a[data-reveal]");
      return {
        text: (p.textContent || "").trim().slice(0, 40),
        opacity: cs.opacity,
        pIsIn: p.classList.contains("is-in"),
        aOpacity: a ? getComputedStyle(a).opacity : null,
        aIsIn: a ? a.classList.contains("is-in") : null,
      };
    });
  });

  console.log("\nFooter state after scroll to bottom:");
  console.log(JSON.stringify(footerState, null, 2));

  await browser.close();
})();
