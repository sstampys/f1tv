const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
const SAMPLE = () => {
  window.__n = []; const t0 = performance.now();
  const f = () => {
    const nav = document.querySelector(".site-nav");
    if (nav) {
      const rec = (e) => { const c = getComputedStyle(e); return [+(+c.opacity).toFixed(2), c.translate === "none" ? 0 : parseFloat(c.translate.split(" ")[1] || 0)]; };
      window.__n.push({ t: Math.round(performance.now() - t0), pill: rec(nav), kids: [...nav.children].map(rec) });
    }
    if (performance.now() - t0 < 1500) requestAnimationFrame(f);
  };
  document.addEventListener("DOMContentLoaded", f); if (document.readyState !== "loading") f();
};
(async () => {
  const b = await chromium.launch();
  // 1. first visit
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage(); await p.addInitScript(SAMPLE);
  await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(1700);
  let n = await p.evaluate(() => window.__n);
  console.log("first visit: class", await p.evaluate(() => document.documentElement.className));
  console.log(n.filter((_, i) => i % 5 === 0).map((x) => `${String(x.t).padStart(4)}ms pill=${JSON.stringify(x.pill)} kids=${JSON.stringify(x.kids)}`).join("\n"));
  // 2. same session reload
  await p.addInitScript(SAMPLE); await p.reload({ waitUntil: "load" }); await p.waitForTimeout(500);
  n = await p.evaluate(() => window.__n);
  console.log("reload (same session): class", await p.evaluate(() => document.documentElement.className), "| min pill opacity", Math.min(...n.map((x) => x.pill[0])), "min kid opacity", Math.min(...n.flatMap((x) => x.kids.map((k) => k[0]))));
  await ctx.close();

  // 3. reduced motion
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  p = await ctx.newPage(); await p.addInitScript(SAMPLE);
  await p.goto(BASE + "/", { waitUntil: "load" }); await p.waitForTimeout(1200);
  n = await p.evaluate(() => window.__n);
  console.log("reduced motion: nav min opacity", Math.min(...n.map((x) => x.pill[0])), "| hidden leaves:", await p.evaluate(() => [...document.querySelectorAll("main [data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length));
  const t0 = Date.now(); await p.click('nav a[href="/standings"]'); await p.waitForURL("**/standings"); console.log("reduced-motion nav switch took", Date.now() - t0, "ms (no exit fade)");
  await ctx.close();

  // 4. JS disabled
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  p = await ctx.newPage();
  for (const r of ["/", "/standings", "/schedule"]) {
    await p.goto(BASE + r, { waitUntil: "load" });
    const info = await p.evaluate(() => ({ leaves: document.querySelectorAll("[data-reveal]").length, hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length, nav: getComputedStyle(document.querySelector(".site-nav")).opacity, text: document.querySelector("main").innerText.slice(0, 40).replace(/\n/g, " | ") }));
    console.log("no-JS", r, JSON.stringify(info));
  }
  await ctx.close();
  await b.close();
})();
