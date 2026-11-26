const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);

  // Get the header and tabs elements
  const gapInfo = await page.evaluate(() => {
    const header = document.querySelector("header");
    const tabs = document.querySelector("[data-slot=tabs-list], .editorial-tabs");
    const section = document.querySelector("section");

    const headerRect = header?.getBoundingClientRect();
    const tabsRect = tabs?.getBoundingClientRect();

    // Get all children of section between header and tabs
    const sectionChildren = section ? [...section.children].map(c => ({
      tag: c.tagName,
      cls: c.className,
      text: (c.textContent || "").trim().slice(0, 30),
      rect: c.getBoundingClientRect(),
    })) : [];

    // Check for hidden-but-space-reserved elements
    const hiddenElements = [];
    if (section) {
      section.querySelectorAll("*").forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.1) {
          hiddenElements.push({
            tag: el.tagName,
            cls: el.className,
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            text: (el.textContent || "").trim().slice(0, 20),
          });
        }
      });
    }

    return {
      headerBottom: headerRect ? Math.round(headerRect.bottom) : null,
      tabsTop: tabsRect ? Math.round(tabsRect.top) : null,
      gap: headerRect && tabsRect ? Math.round(tabsRect.top - headerRect.bottom) : null,
      sectionChildren: sectionChildren.map(c => ({ tag: c.tag, cls: c.cls.slice(0, 60), text: c.text, top: Math.round(c.rect.top), bottom: Math.round(c.rect.bottom) })),
      hiddenElements: hiddenElements.slice(0, 5),
    };
  });

  console.log("Gap info:", JSON.stringify(gapInfo, null, 2));

  await browser.close();
})();
