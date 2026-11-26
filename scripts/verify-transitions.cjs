const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
const SAMPLER = () => {
  window.__s = []; const t0 = performance.now();
  const tick = () => {
    const leaves = [...document.querySelectorAll("main [data-reveal]")];
    window.__s.push({ t: Math.round(performance.now() - t0), path: location.pathname, n: leaves.length,
      o: leaves.slice(0, 3).map((e) => +(+getComputedStyle(e).opacity).toFixed(2)),
      nav: document.querySelector(".site-nav").getAnimations({ subtree: true }).length,
      scrollY: Math.round(window.scrollY), focus: document.activeElement && document.activeElement.tagName });
    if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
  };
  tick();
};
const show = async (p, every = 6) => {
  const s = await p.evaluate(() => window.__s);
  console.log(s.filter((_, i) => i % every === 0 || i === s.length - 1).map((x) => `${String(x.t).padStart(4)}ms ${x.path.padEnd(11)} leaves=${String(x.n).padStart(2)} opacity=${JSON.stringify(x.o)} navAnims=${x.nav} y=${x.scrollY} focus=${x.focus}`).join("\n"));
  return s;
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160))); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);

  console.log("--- A. click Standings from Countdown");
  await p.evaluate(SAMPLER); await p.click('nav a[href="/standings"]'); await p.waitForTimeout(2700);
  let s = await show(p, 5);
  const swap = s.find((x) => x.path === "/standings");
  const firstFade = s.find((x) => x.o[0] < 1);
  console.log("path changed at", swap && swap.t, "ms; first fade-out frame at", firstFade && firstFade.t, "ms");

  console.log("--- B. scroll mid-page on Schedule, click Countdown (scroll reset + footer re-reveal)");
  await p.click('nav a[href="/schedule"]'); await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo(0, 200)); await p.waitForTimeout(600);
  await p.evaluate(SAMPLER); await p.click('nav a[href="/"]'); await p.waitForTimeout(2700);
  await show(p, 8);
  console.log("heading focus:", await p.evaluate(() => document.activeElement && document.activeElement.tagName + ":" + document.activeElement.textContent.slice(0, 20)));

  console.log("--- C. browser back / forward");
  await p.click('nav a[href="/standings"]'); await p.waitForTimeout(2200);
  await p.evaluate(SAMPLER); await p.goBack(); await p.waitForTimeout(2700); await show(p, 10);
  await p.evaluate(SAMPLER); await p.goForward(); await p.waitForTimeout(2700); await show(p, 10);
  console.log("final path", await p.evaluate(() => location.pathname), "visible leaves:", await p.evaluate(() => [...document.querySelectorAll("main [data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length, "stuck at 0"));

  console.log("--- D. rapid double click on Schedule");
  await p.evaluate(SAMPLER);
  await p.evaluate(() => { const a = document.querySelector('nav a[href="/schedule"]'); a.click(); setTimeout(() => a.click(), 60); });
  await p.waitForTimeout(2700); await show(p, 14);
  console.log("history length ok? path:", await p.evaluate(() => location.pathname), "hidden leaves in viewport:", await p.evaluate(() => [...document.querySelectorAll("main [data-reveal]")].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && getComputedStyle(e).opacity === "0"; }).length));

  console.log("--- E. nav never re-animates; same nav node");
  console.log("nav node remount check:", await p.evaluate(() => { const n = document.querySelector(".site-nav"); return n.getAnimations({ subtree: true }).length === 0; }));
  console.log("console errors:", errs.length ? errs : "none");
  await b.close();
})();
