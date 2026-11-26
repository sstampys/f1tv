/*
 * Functional checks for the reveal pipeline that the matrix does not cover:
 * no-JS, reduced motion, keyboard focus, console errors, a viewport resize
 * mid-scroll, a collapsing mobile toolbar, and a forced test of the
 * last-element fallback (elements that can never reach the trigger line).
 */
const { chromium } = require("playwright");

const BASE = "http://localhost:8080";
const SEL = "[data-reveal]";
const out = [];
const say = (name, ok, detail) => { out.push(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };

const leafStates = (p) => p.evaluate((sel) => {
  const ls = [...document.querySelectorAll(sel)].filter((e) => !e.querySelector(sel));
  return { total: ls.length, hidden: ls.filter((e) => getComputedStyle(e).opacity !== "1").length };
}, SEL);

(async () => {
  const b = await chromium.launch();

  // 1. no JavaScript: content must be visible (noscript style).
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const p = await ctx.newPage();
    for (const r of ["/", "/standings", "/schedule"]) {
      await p.goto(BASE + r, { waitUntil: "load" });
      const s = await p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => getComputedStyle(e).opacity !== "1").length, SEL);
      const text = await p.evaluate(() => document.querySelector("main").innerText.replace(/\s+/g, " ").slice(0, 30));
      say(`no-JS ${r}`, s === 0, `hidden=${s} text="${text}"`);
    }
    await ctx.close();
  }

  // 2. reduced motion: no reveal animation, everything visible, fast navigation.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/schedule", { waitUntil: "networkidle" });
    await p.waitForTimeout(1200);
    const anns = await p.evaluate((sel) => [...document.querySelectorAll(sel)].reduce((n, e) => n + e.getAnimations().length, 0), SEL);
    const s = await leafStates(p);
    say("reduced-motion /schedule", s.hidden === 0 && anns === 0, `hidden=${s.hidden}/${s.total} animations=${anns}`);
    const t0 = Date.now();
    await p.click('nav a[href="/"]');
    await p.waitForURL("**/");
    say("reduced-motion navigation", Date.now() - t0 < 400, `${Date.now() - t0}ms (no exit fade)`);
    await ctx.close();
  }

  // 3. keyboard focus: a focused control is never invisible; console clean.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 80)));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 80)));
    await p.goto(BASE + "/schedule", { waitUntil: "networkidle" });
    await p.waitForTimeout(2200);
    let invisibleFocused = 0;
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press("Tab");
      const bad = await p.evaluate((sel) => {
        const a = document.activeElement;
        const leaf = a && a.closest(sel);
        if (!leaf) return false;
        const r = leaf.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > 0 && getComputedStyle(leaf).opacity !== "1";
      }, SEL);
      if (bad) invisibleFocused++;
    }
    say("focus visible", invisibleFocused === 0, `${invisibleFocused} focused leaves hidden`);
    say("console /schedule", errs.length === 0, errs.join(" | ") || "clean");
    await ctx.close();
  }

  // 4. resize mid-scroll: the trigger line follows the new height, nothing stuck.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + "/schedule", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    await p.evaluate(() => window.scrollTo(0, 400));
    await p.waitForTimeout(600);
    await p.setViewportSize({ width: 1440, height: 600 });
    await p.waitForTimeout(900);
    // scroll through under the new height
    await p.evaluate(() => new Promise((res) => { const f = () => { const m = document.documentElement.scrollHeight - innerHeight; if (scrollY >= m - 1) return res(); window.scrollBy(0, 3); requestAnimationFrame(f); }; f(); }));
    await p.waitForTimeout(1500);
    const stuck = await p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => !e.querySelector(sel) && !e.hasAttribute("data-in")).length, SEL);
    say("resize 900->600 mid-scroll", stuck === 0, `stuck=${stuck}`);
    await ctx.close();
  }

  // 5. collapsing mobile toolbar: shrink/grow the viewport height while scrolling.
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(BASE + "/schedule", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    for (let i = 0; i < 6; i++) {
      await p.evaluate((dy) => window.scrollBy(0, dy), 220);
      await p.setViewportSize({ width: 390, height: i % 2 ? 844 : 744 });
      await p.waitForTimeout(250);
    }
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(1500);
    const stuck = await p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => !e.querySelector(sel) && !e.hasAttribute("data-in") && e.getBoundingClientRect().top < innerHeight).length, SEL);
    say("mobile toolbar resize", stuck === 0, `visible-but-stuck=${stuck}`);
    await ctx.close();
  }

  // 6. forced fallback: a trigger line far above the page bottom means the last
  //    elements can never cross it, so they must reveal through the layout path.
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      const set = () => document.documentElement.style.setProperty("--motion-reveal-trigger", "40%");
      set();
      document.addEventListener("DOMContentLoaded", set);
    });
    await p.goto(BASE + "/schedule", { waitUntil: "networkidle" });
    await p.waitForTimeout(2000);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(2500);
    const s = await p.evaluate((sel) => {
      const ls = [...document.querySelectorAll(sel)].filter((e) => !e.querySelector(sel));
      const hidden = ls.filter((e) => !e.hasAttribute("data-in"));
      return { total: ls.length, hidden: hidden.length, names: hidden.map((e) => e.textContent.trim().slice(0, 20)) };
    }, SEL);
    say("forced fallback (trigger 40%)", s.hidden === 0, `hidden=${s.hidden}/${s.total} ${s.names.slice(0, 4).join(",")}`);
    await ctx.close();
  }

  await b.close();
  console.log(out.join("\n"));
  console.log("\n" + (out.every((l) => l.startsWith("PASS")) ? "ALL PASS" : "FAILURES PRESENT"));
})();
