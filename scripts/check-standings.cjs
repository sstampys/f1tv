const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8080/standings", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const main = document.querySelector("main");
    const rows = document.querySelectorAll("[data-reveal]");
    const tableRows = document.querySelectorAll("tbody tr");
    const firstRows = [...document.querySelectorAll("tbody tr")].slice(0, 3).map((tr) => {
      const cs = getComputedStyle(tr);
      return { text: (tr.textContent || "").trim().slice(0, 30), opacity: cs.opacity, isIn: tr.classList.contains("is-in") };
    });
    return {
      mainText: (main?.textContent || "").trim().slice(0, 200),
      revealCount: rows.length,
      tableRowCount: tableRows.length,
      firstRows,
    };
  });

  console.log("main text:", JSON.stringify(info.mainText));
  console.log("reveal targets:", info.revealCount);
  console.log("table rows:", info.tableRowCount);
  console.log("first rows:", JSON.stringify(info.firstRows, null, 2));
  console.log("errors:", errors.slice(0, 3));

  await page.screenshot({ path: "/tmp/standings-check.png", fullPage: true });
  console.log("screenshot saved /tmp/standings-check.png");
  await browser.close();
})();
