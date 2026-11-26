const { chromium } = require("playwright");

const PAGES = ["/", "/standings", "/schedule", "/legal", "/demo"];

async function auditPage(browser, path) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:8080${path}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);

  // Scroll through the whole page slowly to trigger all observers
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < totalHeight; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Now check every data-reveal element for permanent invisibility
  const invisible = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const cs = getComputedStyle(el);
      const opacity = parseFloat(cs.opacity);
      const hasIsIn = el.classList.contains("is-in");
      if (opacity < 0.99) {
        const r = el.getBoundingClientRect();
        out.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 50),
          text: (el.textContent || "").trim().slice(0, 30),
          opacity: cs.opacity,
          hasIsIn,
          height: Math.round(r.height),
          width: Math.round(r.width),
        });
      }
    });
    return out;
  });

  await context.close();
  return invisible;
}

(async () => {
  const browser = await chromium.launch();
  for (const path of PAGES) {
    try {
      const inv = await auditPage(browser, path);
      console.log(`\n=== ${path}: ${inv.length} invisible elements ===`);
      inv.slice(0, 20).forEach((i) =>
        console.log(`  <${i.tag} class="${i.cls}"> "${i.text}" opacity=${i.opacity} is-in=${i.hasIsIn} ${i.width}x${i.height}`)
      );
    } catch (e) {
      console.log(`\n=== ${path}: ERROR ${e.message} ===`);
    }
  }
  await browser.close();
})();
