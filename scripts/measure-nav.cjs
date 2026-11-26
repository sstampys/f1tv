const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  const navInfo = await page.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect();
    const cs = (el) => getComputedStyle(el);
    const nav = document.querySelector('nav.site-nav');
    const vp = { w: window.innerWidth, h: window.innerHeight };
    
    if (!nav) return { error: 'no nav' };
    
    const nRect = rect(nav);
    const ncs = cs(nav);
    
    const links = [...nav.querySelectorAll('a')];
    const linkInfos = links.map((l, i) => {
      const lRect = rect(l);
      const lcs = cs(l);
      return {
        index: i,
        text: l.textContent.trim(),
        rect: { l: Math.round(lRect.l), r: Math.round(lRect.r), w: Math.round(lRect.w), h: Math.round(lRect.h) },
        computed: {
          paddingLeft: lcs.paddingLeft,
          paddingRight: lcs.paddingRight,
          gap: lcs.gap,
          width: lcs.width,
          height: lcs.height,
          color: lcs.color,
        }
      };
    });
    
    return {
      viewport: vp,
      nav: {
        rect: { t: Math.round(nRect.t), b: Math.round(nRect.b), l: Math.round(nRect.l), r: Math.round(nRect.r), w: Math.round(nRect.w), h: Math.round(nRect.h) },
        computed: {
          paddingTop: ncs.paddingTop,
          paddingRight: ncs.paddingRight,
          paddingBottom: ncs.paddingBottom,
          paddingLeft: ncs.paddingLeft,
          gap: ncs.gap,
          borderRadius: ncs.borderRadius,
          backgroundColor: ncs.backgroundColor,
          width: ncs.width,
          height: ncs.height,
        }
      },
      links: linkInfos,
    };
  });

  console.log(JSON.stringify(navInfo, null, 2));
  
  await browser.close();
})();
