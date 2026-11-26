const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  
  for (const vp of [
    { width: 375, height: 900, name: "375" },
    { width: 768, height: 1024, name: "768" },
    { width: 1024, height: 1366, name: "1024" },
    { width: 1440, height: 900, name: "1440" },
  ]) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    
    const result = await page.evaluate(() => {
      const table = document.querySelector("table");
      const thead = document.querySelector("thead");
      const ths = thead ? [...thead.querySelectorAll("th")] : [];
      const rows = [...document.querySelectorAll("tbody tr")].length;
      const firstRowTds = [...document.querySelectorAll("tbody tr")].slice(0, 1).map(tr => tr.querySelectorAll("td"));
      const lastTd = firstRowTds[0] ? firstRowTds[0][firstRowTds[0].length - 1] : null;
      
      const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const winHeader = document.querySelector("thead th:last-child");
      const winRect = winHeader ? winHeader.getBoundingClientRect() : null;
      
      const thInfos = ths.map(th => {
        const r = th.getBoundingClientRect();
        return { text: th.textContent?.trim(), width: Math.round(r.width), right: Math.round(r.right) };
      });
      
      return {
        hasHScroll,
        tableWidth: table?.clientWidth || 0,
        viewportWidth: window.innerWidth,
        thInfos,
        lastTdRight: lastTd ? Math.round(lastTd.getBoundingClientRect().right) : null,
        winRight: winRect ? Math.round(winRect.right) : null,
        rows,
      };
    });
    
    console.log(`\n=== @ ${vp.name} ===`);
    console.log(JSON.stringify(result, null, 2));
    await context.close();
  }
  
  await browser.close();
})();
