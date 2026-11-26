/*
 * Reveal lab. Instruments a page from OUTSIDE the app (addInitScript), so no
 * logging code lives in src/. Works on f1box (SITE=ours) and officecommun.com
 * (SITE=ref).
 *
 *   SITE=ours PAGE=/ H=700 W=1440 SCEN=slow node scripts/motion-lab.cjs
 *   MODE=perf  -> light run (frame times, long tasks, CLS, CDP layout counters)
 *   THROTTLE=4 -> Emulation.setCPUThrottlingRate
 *   MOBILE=1   -> touch emulation, scrolls with synthesized touch gestures
 */
const { chromium } = require("playwright");

const SITES = {
  ours: { base: process.env.BASE || "http://localhost:8080", sel: "[data-reveal]", kind: "ours" },
  ref: { base: "https://officecommun.com", sel: ".reveal", kind: "ref" },
};

const INIT = (cfg) => {
  const L = (window.__lab = { io: [], inn: [], anims: [], frames: [], long: [], cls: 0, first: {}, ops: {}, innT: {}, hidden0: null, meta: {} });
  const ids = new WeakMap();
  let uid = 0;
  const id = (el) => { if (!ids.has(el)) ids.set(el, ++uid); return ids.get(el); };
  const txt = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 22) || el.className.toString().slice(0, 22);
  const leaves = () => [...document.querySelectorAll(cfg.sel)].filter((e) => !e.querySelector(cfg.sel));
  const isIn = (el) => (cfg.kind === "ref" ? el.classList.contains("is-in") : el.hasAttribute("data-in"));
  const ty = (el) => {
    const cs = getComputedStyle(el);
    let y = 0;
    if (cs.translate && cs.translate !== "none") y += parseFloat(cs.translate.split(" ")[1] || 0) || 0;
    if (cs.transform && cs.transform !== "none") y += new DOMMatrix(cs.transform).m42;
    return y;
  };

  if (!cfg.light) {
    const Native = window.IntersectionObserver;
    window.IntersectionObserver = class extends Native {
      constructor(cb, opts) {
        const mine = /^0px 0px -/.test(String((opts && opts.rootMargin) || ""));
        super((entries, obs) => {
          if (mine) {
            const t = performance.now();
            for (const e of entries) {
              L.io.push({ t, k: id(e.target), txt: txt(e.target), isI: e.isIntersecting, ratio: e.intersectionRatio, top: e.boundingClientRect.top, bottom: e.boundingClientRect.bottom, ty: ty(e.target), vh: innerHeight, vvh: window.visualViewport ? window.visualViewport.height : null, sy: scrollY, rb: e.rootBounds ? e.rootBounds.bottom : null });
            }
          }
          return cb(entries, obs);
        }, opts);
      }
    };
    const nativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function (kf, opts) {
      const a = nativeAnimate.call(this, kf, opts);
      if (this.matches && this.matches(cfg.sel)) {
        const rec = { t: performance.now(), k: id(this), d: opts.duration, delay: opts.delay || 0, end: null };
        L.anims.push(rec);
        a.finished.then(() => { rec.end = performance.now(); }).catch(() => {});
      }
      return a;
    };
    document.addEventListener("transitionend", (e) => {
      if (e.propertyName === "opacity" && e.target.matches && e.target.matches(cfg.sel)) L.anims.push({ t: performance.now(), k: id(e.target), end: true, ev: "transitionend" });
    }, true);

    new MutationObserver((rs) => {
      for (const r of rs) {
        const el = r.target;
        if (!(el instanceof HTMLElement) || !el.matches(cfg.sel) || el.querySelector(cfg.sel)) continue;
        const k = id(el);
        if (L.innT[k] != null || !isIn(el)) continue;
        const t = performance.now();
        L.innT[k] = t;
        const rect = el.getBoundingClientRect();
        const y = ty(el);
        const docTop = rect.top - y + scrollY;
        const delay = cfg.kind === "ref" ? parseFloat(getComputedStyle(el).transitionDelay) * 1000 || 0 : (L.anims.filter((a) => a.k === k).pop() || {}).delay || 0;
        const ioPrev = L.io.filter((x) => x.k === k && x.isI).length > 0;
        L.inn.push({ t, k, txt: txt(el), layoutTop: rect.top - y, h: rect.height, left: rect.left, docTop, ty: y, vh: innerHeight, sy: scrollY, delay, via: ioPrev ? "io" : "fallback" });
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ["class", "data-in"] });
  }

  L.shifts = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { L.cls += e.value; L.shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(5), src: (e.sources || []).map((s) => (s.node && (s.node.textContent || s.node.nodeName || "").trim().slice(0, 18)) + " " + Math.round(s.previousRect.y) + "->" + Math.round(s.currentRect.y)) }); } }).observe({ type: "layout-shift", buffered: true });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) L.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch {}

  let last = 0;
  let frame = 0;
  const loop = (now) => {
    frame++;
    if (last) L.frames.push([Math.round(now), +(now - last).toFixed(1)]);
    last = now;
    if (!cfg.light) {
      const vh = innerHeight;
      if (L.hidden0 === null && document.body) {
        const ls = leaves();
        if (ls.length) L.hidden0 = ls.filter((e) => getComputedStyle(e).opacity !== "1").length + "/" + ls.length;
      }
      for (const el of leaves()) {
        const k = id(el);
        const r = el.getBoundingClientRect();
        const y = ty(el);
        const top = r.top - y;
        if (L.first[k] == null && top < vh && r.bottom - y > 0) L.first[k] = { t: now, top, vh, sy: scrollY, txt: txt(el) };
        if (L.innT[k] != null && now - L.innT[k] < 2200) (L.ops[k] || (L.ops[k] = [])).push([Math.round(now), +(+getComputedStyle(el).opacity).toFixed(3)]);
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollRun(page, cdp, scen, mobile, vw, vh) {
  const docH = () => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const atEnd = async () => (await page.evaluate(() => Math.ceil(scrollY) >= document.documentElement.scrollHeight - innerHeight - 1));
  const wheelTo = async (delta, gap, limit = 4000) => {
    for (let i = 0; i < 400 && !(await atEnd()); i++) { await page.mouse.wheel(0, delta); await sleep(gap); }
  };
  const gesture = async (dist, speed) => cdp.send("Input.synthesizeScrollGesture", { x: vw / 2, y: vh / 2, yDistance: -dist, speed, gestureSourceType: "touch" });
  const max = await docH();
  if (max <= 0) return "no-scroll";
  await page.mouse.move(vw / 2, vh / 2);
  if (scen === "slow") {
    await page.evaluate(() => new Promise((res) => { const f = () => { const m = document.documentElement.scrollHeight - innerHeight; if (scrollY >= m - 1) return res(); window.scrollBy(0, 2); requestAnimationFrame(f); }; f(); }));
  } else if (scen === "fast") {
    if (mobile) { for (let i = 0; i < 12 && !(await atEnd()); i++) await gesture(400, 4000); } else await wheelTo(160, 16);
  } else if (scen === "momentum") {
    for (let burst = 0; burst < 40 && !(await atEnd()); burst++) {
      for (let d = 90; d > 1.5; d *= 0.93) { if (mobile) break; await page.mouse.wheel(0, d); await sleep(16); }
      if (mobile) await gesture(300, 1500);
      await sleep(350);
    }
  } else if (scen === "keyboard") {
    for (let i = 0; i < 30 && !(await atEnd()); i++) { await page.keyboard.press(i % 2 ? "PageDown" : "Space"); await sleep(650); }
  } else if (scen === "updown") {
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => { const m = document.documentElement.scrollHeight - innerHeight; const y = k * 1.6 + 70 * Math.sin(k / 14); window.scrollTo(0, Math.max(0, Math.min(m, y))); k++; if (k * 1.6 > m + 150) return res(); requestAnimationFrame(f); }; f(); }));
  } else if (scen === "reload-mid") {
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.55));
    await sleep(1800);
    await page.reload({ waitUntil: "networkidle" });
    await sleep(2500);
    await wheelTo(120, 16);
  }
  return "ok";
}

async function lab(opts) {
  const site = SITES[opts.site];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: opts.w, height: opts.h },
    ...(opts.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
  await page.addInitScript(INIT, { sel: site.sel, kind: site.kind, light: opts.mode === "perf" });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  if (opts.throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: opts.throttle });
  await page.goto(site.base + opts.page, { waitUntil: "networkidle" });
  if (opts.beforeScroll) await opts.beforeScroll(page);
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const t0 = await page.evaluate(() => performance.now());
  if (opts.scen !== "load") await scrollRun(page, cdp, opts.scen, opts.mobile, opts.w, opts.h);
  else await sleep(4000);
  await sleep(2600);
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const lab = await page.evaluate((cfg) => {
    const L = window.__lab;
    L.stuck = [...document.querySelectorAll(cfg.sel)].filter((e) => !e.querySelector(cfg.sel) && !(cfg.kind === "ref" ? e.classList.contains("is-in") : e.hasAttribute("data-in")))
      .map((e) => ({ txt: (e.textContent || "").trim().slice(0, 22), docTop: Math.round(e.getBoundingClientRect().top + scrollY), h: Math.round(e.getBoundingClientRect().height) }));
    L.docH = document.documentElement.scrollHeight; L.ch = document.documentElement.clientHeight; L.maxScroll = L.docH - L.ch; L.sy = scrollY;
    return L;
  }, { sel: site.sel, kind: site.kind });
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  await browser.close();
  const d = (k) => +(((m1[k] || 0) - (m0[k] || 0)) * (/Duration/.test(k) ? 1000 : 1)).toFixed(1);
  return { lab, t0, errors, docH, cdp: { layouts: d("LayoutCount"), recalcs: d("RecalcStyleCount"), layoutMs: d("LayoutDuration"), recalcMs: d("RecalcStyleDuration"), scriptMs: d("ScriptDuration") } };
}

function analyse(res, opts) {
  const L = res.lab;
  const vh = opts.h;
  const rows = L.inn.map((e) => {
    const f = L.first[e.k];
    const io = L.io.filter((x) => x.k === e.k && x.isI).pop();
    const ops = L.ops[e.k] || [];
    let rev = 0;
    for (let i = 1; i < ops.length; i++) if (ops[i][1] < ops[i - 1][1] - 0.02) rev++;
    const full = ops.find((o) => o[1] >= 0.999);
    const an = L.anims.filter((a) => a.k === e.k);
    return {
      k: e.k, txt: e.txt, h: Math.round(e.h), via: e.via,
      dist: +(e.vh - e.layoutTop).toFixed(1), // layout top measured up from the bottom edge when the reveal was applied
      ioDist: io ? +(io.vh - (io.top - io.ty)).toFixed(1) : null, // same, from the IO entry itself
      ioTy: io ? +io.ty.toFixed(1) : null,
      firstSeenToIn: f ? Math.round(e.t - f.t) : null,
      visibleStart: Math.round(e.t + e.delay),
      completion: full ? Math.round(full[0] - e.t) : null,
      delay: Math.round(e.delay), rev, plays: an.filter((a) => !a.ev).length, vh: e.vh, docTop: Math.round(e.docTop), left: Math.round(e.left),
    };
  });
  const fr = L.frames.map((x) => x[1]);
  const sorted = [...fr].sort((a, b) => a - b);
  const p = (q) => sorted[Math.floor(sorted.length * q)] || 0;
  return { rows, stuck: L.stuck, shifts: L.shifts, perf: { frames: fr.length, p50: p(0.5), p95: p(0.95), max: sorted[sorted.length - 1] || 0, over25: fr.filter((x) => x > 25).length, over50: fr.filter((x) => x > 50).length, longtasks: L.long.filter((x) => x[1] >= 50).length, cls: +L.cls.toFixed(4) }, vh };
}

module.exports = { lab, analyse, SITES };

if (require.main === module) {
  (async () => {
    const opts = {
      site: process.env.SITE || "ours", page: process.env.PAGE || "/", w: +(process.env.W || 1440), h: +(process.env.H || 900),
      scen: process.env.SCEN || "slow", mode: process.env.MODE || "trace", throttle: +(process.env.THROTTLE || 1), mobile: process.env.MOBILE === "1",
    };
    if (process.env.PAST === "1") opts.beforeScroll = async (p) => { await p.click("text=Show Past Races"); await sleep(1500); };
    const res = await lab(opts);
    const a = analyse(res, opts);
    console.log(JSON.stringify({ opts: { ...opts, beforeScroll: undefined }, hidden0: res.lab.hidden0, docH: res.docH, errors: res.errors, cdp: res.cdp, perf: a.perf }));
    if (opts.mode !== "perf") {
      for (const r of a.rows) console.log(`${String(r.k).padStart(3)} ${r.txt.padEnd(22)} h=${String(r.h).padStart(3)} via=${r.via.padEnd(8)} dist=${String(r.dist).padStart(7)} ioDist=${String(r.ioDist).padStart(7)} ty@io=${String(r.ioTy).padStart(5)} delay=${String(r.delay).padStart(3)} start=${String(r.visibleStart).padStart(5)} done=${String(r.completion).padStart(4)} rev=${r.rev} plays=${r.plays}`);
    }
    if (process.env.OUT) require("fs").writeFileSync(process.env.OUT, JSON.stringify({ opts: { ...opts, beforeScroll: undefined }, res, a }));
  })();
}
