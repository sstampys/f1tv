const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
(async () => {
  const b = await chromium.launch();
  for (const route of ["/", "/standings", "/schedule", "/legal"]) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const msgs = [];
    p.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(m.type() + ": " + m.text().slice(0, 200)); });
    p.on("pageerror", (e) => msgs.push("pageerror: " + e.message.slice(0, 200)));
    await p.goto(BASE + route, { waitUntil: "networkidle" });
    await p.waitForTimeout(2500);
    const head = await p.evaluate(() => ({ canon: [...document.querySelectorAll('link[rel=canonical]')].map(l => l.href), ogurl: [...document.querySelectorAll('meta[property="og:url"]')].map(l => l.content), cls: document.documentElement.className }));
    console.log(route, JSON.stringify(head), msgs.length ? msgs : "console clean");
    await ctx.close();
  }
  await b.close();
})();
