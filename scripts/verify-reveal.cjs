const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const pages = [
    { path: "/", name: "home" },
    { path: "/standings", name: "standings" },
    { path: "/schedule", name: "schedule" },
    { path: "/legal", name: "legal" },
    { path: "/demo", name: "demo" },
  ];
  const sizes = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1024, height: 1366 },
    { width: 1440, height: 900 },
  ];

  for (const p of pages) {
    for (const s of sizes) {
      const context = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(`http://localhost:8080${p.path}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await page.waitForTimeout(2500);
      // Full page screenshot
      await page.screenshot({ path: `/tmp/shots/${p.name}-${s.width}x${s.height}-full.png` });
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `/tmp/shots/${p.name}-${s.width}x${s.height}-bottom.png` });
      // Scroll to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `/tmp/shots/${p.name}-${s.width}x${s.height}-top.png` });
      await context.close();
      console.log(`done ${p.name} ${s.width}x${s.height}`);
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
