const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  
  const pages = [
    { url: "http://localhost:8080/", name: "home" },
    { url: "http://localhost:8080/standings", name: "standings" },
    { url: "http://localhost:8080/schedule", name: "schedule" },
    { url: "http://localhost:8080/legal", name: "legal" },
    { url: "http://localhost:8080/demo", name: "demo" },
  ];
  
  const allResults = {};
  
  for (const bp of [375, 768, 1024, 1440]) {
    allResults[bp] = {};
    
    for (const page of pages) {
      const context = await browser.newContext({ viewport: { width: bp, height: 900 } });
      const tab = await context.newPage();
      const consoleErrors = [];
      tab.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
      await tab.goto(page.url, { waitUntil: "networkidle", timeout: 45000 });
      await tab.waitForTimeout(2000);
      
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
        
        const nav = document.querySelector('nav.site-nav');
        const main = document.querySelector('main');
        const section = document.querySelector('section.editorial-page');
        const h1 = document.querySelector('h1');
        const subtitle = document.querySelector('.lead-text') || document.querySelector('main p');
        const tabsList = document.querySelector('[role="tablist"]') || document.querySelector('.editorial-tabs');
        const table = document.querySelector('table');
        const tableWrapper = document.querySelector('.editorial-table');
        const pageContainer = document.querySelector('.page-container');
        const footer = document.querySelector('footer');
        
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
        
        // Check for horizontal scroll
        const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        
        // Check for nested scroll containers
        const nestedScrollers = [];
        document.querySelectorAll("*").forEach(el => {
          const c = cs(el);
          if ((c.overflowY === "auto" || c.overflowY === "scroll" || c.overflowX === "auto" || c.overflowX === "scroll") && 
              el.scrollHeight > el.clientHeight + 5 && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
            nestedScrollers.push({
              tag: el.tagName,
              cls: el.className,
              overflowX: c.overflowX,
              overflowY: c.overflowY,
              scrollH: el.scrollHeight,
              clientH: el.clientHeight,
              rect: { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }
            });
          }
        });
        
        // Check reveal states
        const revealEls = [...document.querySelectorAll("[data-reveal], .reveal, .rise")];
        const revealInfo = revealEls.map(el => {
          const c = cs(el);
          const r = rect(el);
          return {
            tag: el.tagName,
            cls: el.className,
            hasDataReveal: el.hasAttribute("data-reveal"),
            hasRevealClass: el.classList.contains("reveal"),
            hasRiseClass: el.classList.contains("rise"),
            hasIsIn: el.classList.contains("is-in"),
            opacity: c.opacity,
            transform: c.transform,
            transitionDuration: c.transitionDuration,
            transitionTimingFunction: c.transitionTimingFunction,
            transitionDelay: c.transitionDelay,
            rect: { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) },
            inViewport: r.top < window.innerHeight && r.bottom > 0,
          };
        });
        
        return {
          viewport: vp,
          tokens,
          hasHScroll,
          nestedScrollers,
          nav: nav ? getInfo(nav) : null,
          main: main ? getInfo(main) : null,
          section: section ? getInfo(section) : null,
          h1: h1 ? getInfo(h1) : null,
          subtitle: subtitle ? getInfo(subtitle) : null,
          tabsList: tabsList ? getInfo(tabsList) : null,
          table: table ? getInfo(table) : null,
          tableWrapper: tableWrapper ? getInfo(tableWrapper) : null,
          pageContainer: pageContainer ? getInfo(pageContainer) : null,
          footer: footer ? getInfo(footer) : null,
          revealInfo,
        };
      });
      
      m.consoleErrors = consoleErrors;
      allResults[bp][page.name] = m;
      
      await tab.close();
      await context.close();
    }
  }
  
  fs.writeFileSync("/tmp/f1box-measure-final.json", JSON.stringify(allResults, null, 2));
  console.log("Saved to /tmp/f1box-measure-final.json");
  
  await browser.close();
})();
