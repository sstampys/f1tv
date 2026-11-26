const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    // Check every .rise / .reveal element (not just data-reveal)
    const riseEls = [...document.querySelectorAll(".rise, .reveal")].map((el) => {
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: el.className.slice(0, 40),
        hasDataReveal: el.hasAttribute("data-reveal"),
        hasIsIn: el.classList.contains("is-in"),
        opacity: cs.opacity,
        text: (el.textContent || "").trim().slice(0, 25),
      };
    });
    return riseEls;
  });

  console.log("All .rise / .reveal elements:");
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
