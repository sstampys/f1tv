const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1024, height: 1366 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/schedule", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  
  const stuck = await page.evaluate(() => {
    const els = [...document.querySelectorAll("[data-reveal]")];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const inViewport = r.top < window.innerHeight && r.bottom > 0;
      if (inViewport) {
        const cs = getComputedStyle(el);
        if (cs.opacity === "0") {
          return {
            tag: el.tagName,
            text: (el.textContent || "").trim().slice(0, 30),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            right: Math.round(r.right),
            left: Math.round(r.left),
            opacity: cs.opacity,
            isIn: el.classList.contains("is-in"),
          };
        }
      }
    }
    return null;
  });
  
  if (stuck) {
    console.log("STUCK ELEMENT:", JSON.stringify(stuck, null, 2));
  } else {
    console.log("No stuck element found at 1024x1366");
  }
  
  await browser.close();
})();
