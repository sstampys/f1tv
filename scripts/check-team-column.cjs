const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  
  // Check Team column visibility and content
  const teamCol = await page.evaluate(() => {
    const th = document.querySelector("th[aria-label='Team'], th:last-child");
    if (!th) return { visible: false, found: false };
    
    const rect = th.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.right <= window.innerWidth;
    const text = th.textContent?.trim() || "";
    
    // Check if there's any content in the cells
    const cells = [...document.querySelectorAll("tr")].map(tr => 
      tr.querySelectorAll("td")[2]?.textContent?.trim()
    ).filter(t => t && t.length > 0);
    
    return { 
      visible: isVisible,
      found: true,
      text: text,
      cellContent: cells.length > 0 ? cells : "empty",
      rect: rect
    };
  });
  
  console.log("Team column:", JSON.stringify(teamCol, null, 2));
  
  // Check if Team column shows actual content (not empty)
  const hasContent = await page.evaluate(() => {
    const cells = document.querySelectorAll("td:nth-child(3)"); // Team column
    return Array.from(cells).some(cell => cell.textContent?.trim() !== "");
  });
  
  console.log("Team column has content:", hasContent);
  
  await browser.close();
})();