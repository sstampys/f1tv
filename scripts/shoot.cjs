const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
const widths = (process.env.W || "1440").split(",").map(Number);
const routes = (process.env.R || "/,/standings,/schedule").split(",");
(async () => {
  const b = await chromium.launch();
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    for (const route of routes) {
      await p.goto(BASE + route, { waitUntil: "networkidle" });
      await p.waitForTimeout(2600);
      const name = `/private/var/folders/fb/m0yt77sj5r74xzqksxr32dj40000gn/T/opencode/${process.env.TAG || "s"}-${route === "/" ? "home" : route.slice(1)}-${w}.png`;
      await p.screenshot({ path: name, fullPage: process.env.FULL === "1" });
      console.log(name);
    }
    await ctx.close();
  }
  await b.close();
})();
