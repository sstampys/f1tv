const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  // Get full HTML content
  const html = await page.content();
  fs.writeFileSync("/tmp/standings.html", html);
  console.log("Saved /tmp/standings.html");

  // Check for any empty container that might be hiding content
  const containerCheck = await page.evaluate(() => {
    const containers = document.querySelectorAll("main > *");
    return Array.from(containers).map(container => ({
      tag: container.tagName,
      class: container.className,
      text: (container.textContent || "").trim().slice(0, 50),
      visible: container.offsetParent !== null
    }));
  });

  console.log("Container check:", JSON.stringify(containerCheck, null, 2));
  
  // Check if there's any content in main
  const mainHasContent = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main?.hasChildNodes() && main?.textContent?.trim().length > 10;
  });
  
  console.log("Main has content:", mainHasContent);
  
  await browser.close();
})();