const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8080";
(async () => {
  const b = await chromium.launch();
  for (const w of [375, 1440]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
    await p.evaluate(() => {
      window.__c = { rects: new Set(), values: [], nodes: new Set(), anims: 0, mut: 0 };
      const units = () => [...document.querySelectorAll(".countdown__unit")];
      window.__first = units();
      new MutationObserver((rs) => rs.forEach((r) => { if (r.type === "childList") window.__c.mut++; })).observe(document.querySelector(".countdown"), { childList: true, subtree: true });
      setInterval(() => {
        const u = units();
        window.__c.rects.add(JSON.stringify(u.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.width * 10) / 10]; })));
        window.__c.values.push(u.map((e) => e.querySelector(".countdown__value").textContent).join(" "));
        window.__c.anims += document.querySelector(".countdown").getAnimations({ subtree: true }).length;
        window.__c.sameNodes = u.every((e, i) => e === window.__first[i]);
      }, 250);
    });
    await p.waitForTimeout(66000);
    const c = await p.evaluate(() => ({ rectSets: [...window.__c.rects], distinctValues: new Set(window.__c.values).size, samples: window.__c.values.length, minuteChanged: new Set(window.__c.values.map((v) => v.split(" ")[2])).size, animsSeen: window.__c.anims, childListMutations: window.__c.mut, sameNodes: window.__c.sameNodes, container: [388, 1052] }));
    console.log(w, JSON.stringify(c));
  }
  await b.close();
})();
