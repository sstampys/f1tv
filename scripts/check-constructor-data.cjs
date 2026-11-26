const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  // Check constructor standings data
  const constructorData = await page.evaluate(() => {
    // Look for constructor standings in the DOM
    const constructorsSection = document.querySelector('[value="constructors"]');
    if (constructorsSection) {
      return {
        found: true,
        textLength: constructorsSection.textContent?.trim().length || 0,
        children: constructorsSection.children.length,
        cls: constructorsSection.className,
      };
    }
    return { found: false };
  });

  console.log("Constructor tab panel:", JSON.stringify(constructorData, null, 2));

  // Check all tab panels
  const allPanels = await page.evaluate(() => {
    const panels = document.querySelectorAll("[role=\"tabpanel\"]");
    return Array.from(panels).map((p, i) => ({
      index: i,
      cls: p.className,
      children: p.children.length,
      textLen: p.textContent?.trim().length || 0,
      text: p.textContent?.trim().slice(0, 80) || "",
      style: p.getAttribute("style") || "",
      dataState: p.getAttribute("data-state") || "",
    }));
  });
  console.log("All tab panels:", JSON.stringify(allPanels, null, 2));

  // Check if constructor data exists in React
  const reactData = await page.evaluate(() => {
    // Try to find constructor standings in the page
    const rows = document.querySelectorAll("tbody tr");
    const constructorRows = Array.from(rows).filter(r => {
      const text = r.textContent || "";
      return text.includes("Mercedes") || text.includes("Red Bull") || text.includes("Ferrari");
    });
    return {
      totalRows: rows.length,
      constructorRows: constructorRows.length,
      constructorRowText: constructorRows.map(r => r.textContent?.trim().slice(0, 60) || ""),
    };
  });
  console.log("Constructor rows:", JSON.stringify(reactData, null, 2));

  await browser.close();
})();
