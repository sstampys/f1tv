const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  // Get the full HTML and save it
  const html = await page.content();
  fs.writeFileSync("/tmp/standings.html", html);
  console.log("Saved /tmp/standings.html");

  // Check for any empty containers
  const contentCheck = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return "No main element";
    const elements = main.querySelectorAll("*");
    const emptyElements = [];
    const visibleElements = [];
    
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      const hasContent = el.textContent?.trim().length > 5;
      
      if (!isVisible) {
        emptyElements.push(el);
      } else if (hasContent) {
        visibleElements.push(el);
      }
    });
    
    return {
      emptyElements: emptyElements.length,
      visibleElements: visibleElements.length,
      mainHasContent: main?.textContent?.trim().length > 10,
      mainText: main?.textContent?.trim().slice(0, 200) || "empty"
    };
  });

  console.log("Content check:", JSON.stringify(contentCheck, null, 2));
  
  // Check for any console errors
  console.log("Console errors:", errors.length);
  console.log("Page errors:", errors);
  
  await browser.close();
})();