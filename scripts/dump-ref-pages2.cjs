const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const clean = (h) => h.replace(/<img[^>]*>/g, "<img>").replace(/<svg.*?<\/svg>/g, "<svg>").replace(/<video.*?<\/video>/g,"<video>");
  await p.goto("https://officecommun.com/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  let h = clean(await p.evaluate(() => document.querySelector("#app").innerHTML));
  console.log("== HOME tail ==\n", h.slice(-2500));
  await p.goto("https://officecommun.com/projects/figr", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  h = clean(await p.evaluate(() => document.querySelector("#app").innerHTML));
  console.log("== PROJECT head ==\n", h.slice(0, 2500));
  console.log("== PROJECT tail ==\n", h.slice(-2600));
  await b.close();
})();
