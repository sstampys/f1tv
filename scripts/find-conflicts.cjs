const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  for (const path of ["/", "/standings", "/schedule", "/legal"]) {
    const page = await context.newPage();
    await page.goto(`http://localhost:8080${path}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll("[data-reveal]")].map((el) => {
        const cs = getComputedStyle(el);
        return { tag: el.tagName, cls: el.className.slice(0,40), text: (el.textContent||"").trim().slice(0,20), duration: cs.transitionDuration };
      }).filter(d => !d.duration.includes("0.7s") || d.duration.split(",").length !== 2);
    });
    console.log(`\n=== ${path}: ${bad.length} reveal targets with non-reveal duration ===`);
    bad.slice(0, 25).forEach(b => console.log(`  <${b.tag} class="${b.cls}"> "${b.text}" -> ${b.duration}`));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
