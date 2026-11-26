const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(...a), L(...b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
(async () => {
  const mute = [0, 0, 0].map((c) => Math.round(c * 0.45 + 252 * 0.55));
  console.log("muted text on #fcfcfc ->", mute.join(","), "contrast", ratio(mute, [252, 252, 252]).toFixed(2), ": 1 (AA needs 4.5)");
  const b = await chromium.launch();
  // CLS per route
  for (const route of ["/", "/standings", "/schedule"]) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
    await p.goto(BASE + route, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
    console.log("CLS", route, (await p.evaluate(() => window.__cls)).toFixed(4));
    await ctx.close();
  }
  // focus order and ring
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/schedule", { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const order = [];
  for (let i = 0; i < 7; i++) { await p.keyboard.press("Tab"); order.push(await p.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return `${e.tagName}:${(e.getAttribute("aria-label") || e.textContent).trim().slice(0, 16)} ring=${c.outlineStyle}/${c.outlineWidth} opacity=${c.opacity} inViewport=${r.top >= 0 && r.bottom <= innerHeight}`; })); }
  console.log("tab order:\n  " + order.join("\n  "));
  // nav diff vs reference
  const mine = await p.evaluate(() => { const n = document.querySelector(".site-nav"); const c = getComputedStyle(n); const l = getComputedStyle(n.querySelector(".site-nav__link")); const r = n.getBoundingClientRect(); return { h: r.height, top: r.top, border: c.borderTopWidth + " " + c.borderTopColor, bg: c.backgroundColor, radius: c.borderRadius, gap: c.columnGap, fs: c.fontSize, lh: c.lineHeight, linkColor: l.color, tr: l.transitionDuration + " " + l.transitionProperty }; });
  const rp = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await rp.goto("https://officecommun.com/", { waitUntil: "networkidle" }); await rp.waitForTimeout(1500);
  const ref = await rp.evaluate(() => { const n = document.querySelector(".nav"); const c = getComputedStyle(n); const l = getComputedStyle(n.querySelector(".nav__link")); const r = n.getBoundingClientRect(); return { h: r.height, top: r.top, border: c.borderTopWidth + " " + c.borderTopColor, bg: c.backgroundColor, radius: c.borderRadius, gap: c.columnGap, fs: c.fontSize, lh: c.lineHeight, linkColor: l.color, tr: l.transitionDuration + " " + l.transitionProperty }; });
  console.log("nav ours:", JSON.stringify(mine)); console.log("nav ref :", JSON.stringify(ref));
  await b.close();
})();
