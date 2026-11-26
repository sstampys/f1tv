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
        const nav = document.querySelector("nav.site-nav");
        const nr = nav.getBoundingClientRect();
        const kids = [...nav.children].map((c) => c.getBoundingClientRect());
        const cs = getComputedStyle(nav);
        const cw = document.documentElement.clientWidth;
        const pc = document.querySelector("main .page-container");
        const pr = pc && pc.getBoundingClientRect();
        const dur = {};
        document.querySelectorAll("[data-reveal]").forEach((el) => {
          const c = getComputedStyle(el);
          const k = c.transitionProperty + "|" + c.transitionDuration;
          dur[k] = (dur[k] || 0) + 1;
        });
        return {
          cw, navCenter: nr.left + nr.width / 2, top: nr.top,
          padL: kids[0].left - nr.left, padR: nr.right - kids[kids.length - 1].right,
          containerCenter: pr ? pr.left + pr.width / 2 : null, cLeft: pr && pr.left, cRight: pr && pr.right,
          sw: document.documentElement.scrollWidth, firstTop: pc && pr.top,
          font: getComputedStyle(document.body).fontFamily.slice(0, 40),
          inter: document.fonts.check("15px Inter"), interVar: document.fonts.check("15px 'Inter Variable'"),
          dur,
        };
      });
      console.log(w, route, JSON.stringify(r));
    }
    await ctx.close();
  }
  await b.close();
})();
