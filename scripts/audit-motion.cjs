const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
const INIT = () => {
  window.__leaves = new Map();
  const label = (el) => (el.tagName.toLowerCase() + ":" + (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28));
  const seen = (el) => {
    if (window.__leaves.has(el)) return;
    const cs = getComputedStyle(el);
    window.__leaves.set(el, { label: label(el), mountedAt: performance.now(), mountOpacity: cs.opacity, mountTranslate: cs.translate, inAt: null, anim: null });
  };
  const scan = (n) => { if (!(n instanceof HTMLElement)) return; if (n.matches("[data-reveal]")) seen(n); n.querySelectorAll("[data-reveal]").forEach(seen); };
  new MutationObserver((rs) => {
    for (const r of rs) {
      if (r.type === "childList") r.addedNodes.forEach(scan);
      else if (r.type === "attributes" && r.target.hasAttribute("data-in")) {
        const rec = window.__leaves.get(r.target);
        if (rec && rec.inAt === null) {
          rec.inAt = performance.now();
          const a = r.target.getAnimations().map((x) => ({ d: x.effect.getTiming().duration, delay: x.effect.getTiming().delay, ease: x.effect.getTiming().easing }));
          rec.anim = a;
        }
      }
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-in"] });
  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("[data-reveal]").forEach(seen));
};
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const route of ["/", "/standings", "/schedule"]) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(INIT);
    await p.goto(BASE + route, { waitUntil: "networkidle" });
    await p.waitForTimeout(2500);
    if (route === "/schedule") {
      await p.click("text=Show Past Races");
      await p.waitForTimeout(1500);
    }
    // slow scroll to reveal everything
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= h; y += 300) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(120); }
    await p.waitForTimeout(1500);
    const rows = await p.evaluate(() => [...window.__leaves.values()].map((r) => ({ ...r })));
    const bad = rows.filter((r) => r.mountOpacity !== "0" || r.inAt === null || !r.anim || !r.anim.some((a) => a.d === 700));
    console.log(`\n=== ${route}: ${rows.length} leaves, failing ${bad.length}`);
    const tbl = rows.slice(0, 200).map((r) => `${r.label.padEnd(34)} hiddenAtMount=${r.mountOpacity === "0" ? "yes" : "NO(" + r.mountOpacity + ")"} start=${r.inAt === null ? "never" : Math.round(r.inAt) + "ms"} anim=${r.anim ? r.anim.map((a) => a.d + "ms+" + a.delay).join("|") : "-"} ${bad.includes(r) ? "FAIL" : "pass"}`);
    if (process.env.V) console.log(tbl.join("\n")); else console.log(tbl.filter((l) => l.endsWith("FAIL")).join("\n") || "all pass");
    // cluster summary of start-time spread inside a batch
    await ctx.close();
  }
  await b.close();
})();
