const { chromium } = require("playwright");

const PAGES = [
  { path: "/", name: "home" },
  { path: "/standings", name: "standings" },
  { path: "/schedule", name: "schedule" },
];
const SIZES = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 1366 },
  { width: 1440, height: 900 },
];

async function measurePage(browser, p, s) {
  const context = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto(`http://localhost:8080${p.path}`, { waitUntil: "networkidle", timeout: 45000 });
  // Wait for async data to render + reveal
  await page.waitForTimeout(2500);

  // Collect reveal targets, their computed transition props, and is-in state
  const data = await page.evaluate(() => {
    const els = [...document.querySelectorAll("[data-reveal]")];
    return els.map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 25),
        hasIsIn: el.classList.contains("is-in"),
        opacity: cs.opacity,
        transform: cs.transform,
        delay: cs.transitionDelay,
        duration: cs.transitionDuration,
        ease: cs.transitionTimingFunction,
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        inViewport: r.top < window.innerHeight && r.bottom > 0,
      };
    });
  });

  // Check for data-reveal elements still hidden after 2.5s that are in viewport
  const stuckHidden = data.filter((d) => d.inViewport && d.opacity === "0");

  await context.close();
  return { data, consoleErrors, stuckHidden, page: p, size: s };
}

(async () => {
  const browser = await chromium.launch();
  let allResults = [];
  for (const p of PAGES) {
    for (const s of SIZES) {
      const r = await measurePage(browser, p, s);
      allResults.push(r);
      console.log(
        `\n=== ${p.name} @ ${s.width}x${s.height} ===`
      );
      console.log(`reveal targets: ${r.data.length}, stuck hidden in viewport: ${r.stuckHidden.length}, console errors: ${r.consoleErrors.length}`);
      if (r.stuckHidden.length) {
        console.log("STUCK:", r.stuckHidden.map((d) => d.text).join(" | "));
      }
      if (r.consoleErrors.length) {
        console.log("CONSOLE ERRORS:", r.consoleErrors.slice(0, 3).join(" | "));
      }
      // Print durations/eases to check uniformity
      const durations = [...new Set(r.data.map((d) => d.duration))];
      const eases = [...new Set(r.data.map((d) => d.ease))];
      console.log("durations:", durations.join(", "));
      console.log("eases:", eases.join(", "));
    }
  }
  await browser.close();

  // Save full data
  require("fs").writeFileSync("/tmp/reveal-audit.json", JSON.stringify(allResults, null, 2));
  console.log("\nSaved /tmp/reveal-audit.json");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
