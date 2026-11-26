const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const path of ["/services", "/about", "/contact"]) {
    await p.goto("https://officecommun.com" + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const html = await p.evaluate(() => document.querySelector("#app").innerHTML);
    console.log("=====", path, html.length);
    console.log(html.replace(/<img[^>]*>/g, "<img>").replace(/<svg.*?<\/svg>/g, "<svg>").slice(0, 2600));
  }
  const links = await p.evaluate(() => [...document.querySelectorAll("a")].map(a => a.getAttribute("href")));
  console.log(links.slice(0, 40));
  await b.close();
})();
