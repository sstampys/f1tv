const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  
  const pages = [
    { url: "http://localhost:8080/", name: "home" },
  ];
  
  const allResults = {};
  
  for (const bp of [375, 768, 1024, 1440]) {
    allResults[bp] = {};
    
    for (const page of pages) {
      const context = await browser.newContext({ viewport: { width: bp, height: 900 } });
      const tab = await context.newPage();
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
        
        const section = document.querySelector('section.editorial-page') || document.querySelector('main');
        
        // Find countdown-related elements
        const labelRow = document.querySelector('.flex.gap-2, .flex.items-center.gap-2') || document.querySelector('.flex.gap-2.mb-4');
        const title = document.querySelector('h1');
        const locationLine = document.querySelector('.lead') || document.querySelector('main p');
        const dateLine = document.querySelector('.fine') || document.querySelectorAll('main p')[1];
        const countdown = document.querySelector('.countdown');
        const countdownUnits = document.querySelectorAll('.countdown__unit');
        const countdownValues = document.querySelectorAll('.countdown__value');
        const unitLabels = document.querySelectorAll('.countdown__label');
        
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
        
        // Check for ghost digits
        let ghostDigit = null;
        const allDigits = document.querySelectorAll('.countdown__value');
        // Look for any element that might be a ghost/duplicate
        const ghostElements = [];
        document.querySelectorAll('*').forEach(el => {
          const c = cs(el);
          const r = rect(el);
          const text = el.textContent?.trim();
          // Check for absolutely positioned elements near countdown values
          if (c.position === 'absolute' && text && /^\d+$/.test(text)) {
            ghostElements.push({
              tag: el.tagName,
              cls: el.className,
              text,
              rect: { t: Math.round(r.top), l: Math.round(r.left) },
              computed: { position: c.position, top: c.top, left: c.left, opacity: c.opacity },
            });
          }
        });
        
        return {
          viewport: vp,
          tokens,
          section: section ? getInfo(section) : null,
          labelRow: labelRow ? getInfo(labelRow) : null,
          title: title ? getInfo(title) : null,
          locationLine: locationLine ? getInfo(locationLine) : null,
          dateLine: dateLine ? getInfo(dateLine) : null,
          countdown: countdown ? getInfo(countdown) : null,
          countdownUnits: countdownUnits.length ? Array.from(countdownUnits).map(getInfo) : null,
          countdownValues: countdownValues.length ? Array.from(countdownValues).map(getInfo) : null,
          unitLabels: unitLabels.length ? Array.from(unitLabels).map(getInfo) : null,
          ghostElements,
        };
      });
      
      allResults[bp][page.name] = m;
      
      await tab.close();
      await context.close();
    }
  }
  
  fs.writeFileSync("/tmp/f1box-home-measure.json", JSON.stringify(allResults, null, 2));
  console.log("Saved f1box home measurements to /tmp/f1box-home-measure.json");
  
  await browser.close();
})();
