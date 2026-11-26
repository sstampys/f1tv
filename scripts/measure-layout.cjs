const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
(async () => {
  const b = await chromium.launch();
  for (const w of [375, 768, 1024, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    for (const route of ["/", "/standings", "/schedule"]) {
      await p.goto(BASE + route, { waitUntil: "networkidle" });
      await p.waitForTimeout(2200);
      const r = await p.evaluate(() => {
        const R = (e) => e.getBoundingClientRect();
        const nav = document.querySelector("nav.site-nav");
        const nr = R(nav);
        const kids = [...nav.children].map(R);
        const cw = document.documentElement.clientWidth;
        const lefts = [], rights = [];
        document.querySelectorAll("main [data-reveal], footer [data-reveal]").forEach((el) => {
          if (el.matches("select, tr, thead tr")) { /* fine */ }
          const r = R(el); if (!r.width) return;
          lefts.push(Math.round(r.left)); rights.push(Math.round(r.right));
        });
        const main = document.querySelector("main .page");
        const firstLeaf = document.querySelector("main [data-reveal]");
        const faces = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
        return {
          cw, navCenter: nr.left + nr.width / 2, navTop: nr.top, padL: +(kids[0].left - nr.left).toFixed(1), padR: +(nr.right - kids.at(-1).right).toFixed(1),
          gaps: kids.slice(1).map((k, i) => +(k.left - kids[i].right).toFixed(1)),
          markH: kids[0].height,
          minLeft: Math.min(...lefts), maxRight: Math.max(...rights),
          firstLeafTop: Math.round(R(firstLeaf).top), sw: document.documentElement.scrollWidth,
          loaded: [...new Set(faces)], pageW: Math.round(R(document.querySelector("main .page-container, main .row")).width),
        };
      });
      console.log(w, route, JSON.stringify(r));
    }
    await ctx.close();
  }
  await b.close();
})();
