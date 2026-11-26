const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  
  const pages = [
    { url: "https://officecommun.com/", name: "home" },
    { url: "https://officecommun.com/services", name: "services" },
    { url: "https://officecommun.com/about", name: "about" },
    { url: "https://officecommun.com/contact", name: "contact" },
  ];
  
  const allResults = {};
  
  for (const bp of [375, 768, 1024, 1440]) {
    allResults[bp] = {};
    
    for (const page of pages) {
      const context = await browser.newContext({ viewport: { width: bp, height: 900 } });
      const tab = await context.newPage();
      await tab.goto(page.url, { waitUntil: "networkidle", timeout: 45000 });
      await tab.waitForTimeout(1000);
      
      const m = await tab.evaluate(() => {
        const rect = (el) => el.getBoundingClientRect();
        const cs = (el) => getComputedStyle(el);
        const vp = { w: window.innerWidth, h: window.innerHeight };
        
        const rootStyles = getComputedStyle(document.documentElement);
        const tokens = {};
        for (let i = 0; i < rootStyles.length; i++) {
          const name = rootStyles[i];
          if (name.startsWith('--')) {
            tokens[name] = rootStyles.getPropertyValue(name).trim();
          }
        }
        
        const nav = document.querySelector('nav');
        const main = document.querySelector('main');
        
        let wordmark = null;
        let label = null;
        let statement = null;
        let clientsList = null;
        let alsoLabel = null;
        let alsoParagraph = null;
        let contactLink = null;
        let takeCallLink = null;
        let workGrid = null;
        let footer = null;
        
        if (nav) {
          wordmark = nav.querySelector('.nav__home') || nav.querySelector('a:first-child') || nav.querySelector('[href="/"]');
        }
        
        if (main) {
          const allPs = Array.from(main.querySelectorAll('p'));
          label = allPs.find(p => p.textContent.includes('Studio'));
          statement = main.querySelector('h1');
          clientsList = allPs.find(p => p.textContent.includes('Clients'));
          alsoLabel = allPs.find(p => p.textContent.includes('Also'));
          contactLink = Array.from(main.querySelectorAll('a')).find(a => a.textContent.includes('Contact'));
          takeCallLink = Array.from(main.querySelectorAll('a')).find(a => a.textContent.includes('Take a call'));
          workGrid = main.querySelector('[region="Work"]') || main.querySelector('section');
          footer = allPs[allPs.length - 1];
        }
        
        const getInfo = (el) => {
          if (!el) return null;
          const r = rect(el);
          const c = cs(el);
          return {
            rect: { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) },
            computed: {
              overflowX: c.overflowX,
              overflowY: c.overflowY,
              paddingLeft: c.paddingLeft,
              paddingRight: c.paddingRight,
              marginTop: c.marginTop,
              marginBottom: c.marginBottom,
              fontSize: c.fontSize,
              lineHeight: c.lineHeight,
              fontWeight: c.fontWeight,
              letterSpacing: c.letterSpacing,
              color: c.color,
              display: c.display,
              position: c.position,
              top: c.top,
              left: c.left,
              width: c.width,
              height: c.height,
              maxWidth: c.maxWidth,
              textTransform: c.textTransform,
            }
          };
        };
        
        return {
          viewport: vp,
          tokens,
          nav: nav ? getInfo(nav) : null,
          wordmark: wordmark ? getInfo(wordmark) : null,
          label: label ? getInfo(label) : null,
          statement: statement ? getInfo(statement) : null,
          clientsList: clientsList ? getInfo(clientsList) : null,
          alsoLabel: alsoLabel ? getInfo(alsoLabel) : null,
          alsoParagraph: alsoParagraph ? getInfo(alsoParagraph) : null,
          contactLink: contactLink ? getInfo(contactLink) : null,
          takeCallLink: takeCallLink ? getInfo(takeCallLink) : null,
          workGrid: workGrid ? getInfo(workGrid) : null,
          footer: footer ? getInfo(footer) : null,
        };
      });
      
      allResults[bp][page.name] = m;
      
      await tab.close();
      await context.close();
    }
  }
  
  fs.writeFileSync("/tmp/ref-measure-final.json", JSON.stringify(allResults, null, 2));
  console.log("Saved to /tmp/ref-measure-final.json");
  
  await browser.close();
})();
