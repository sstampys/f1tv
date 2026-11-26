/*
 * Runs the reveal lab over the scenario matrix and reduces every run to the
 * pass criteria. Usage:  SITE=ours TAG=before node scripts/motion-matrix.cjs
 * Optional: PAGES=/,/schedule  HEIGHTS=600,700  SCENS=slow,fast  QUICK=1
 */
const fs = require("fs");
const { lab, analyse } = require("./motion-lab.cjs");

const SITE = process.env.SITE || "ours";
const TAG = process.env.TAG || "run";
const OUT = process.env.OUTDIR || "/private/var/folders/fb/m0yt77sj5r74xzqksxr32dj40000gn/T/opencode/matrix";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = (process.env.PAGES || (SITE === "ours" ? "/,/standings,/schedule" : "/")).split(",");
const DESK = (process.env.HEIGHTS || "600,700,800,900,1000").split(",").map(Number);
const SCENS = (process.env.SCENS || "slow,fast,momentum,keyboard,updown,reload-mid").split(",");
const MOBILE = process.env.MOBILE_SIZES === "" ? [] : (process.env.MOBILE_SIZES || "375x667,390x844").split(",").map((s) => s.split("x").map(Number));
const TH = +(process.env.THROTTLE || 1);

const TRIGGER_PCT = 0.06;
const OFFSET = +(process.env.OFFSET || 12); // measured on the reference: dist - 6%vh

// the ordering rule: rows by >50% vertical overlap, rows by top, in-row by left
function visualOrder(items) {
  // mirrors visualOrder() in src/lib/reveal.ts: leaves sharing a parent are one
  // cell, banded on the cell box, then cells left to right, lines top to bottom
  const groups = new Map();
  for (const it of items) {
    const key = it.pk !== undefined ? it.pk : it.txt;
    let g = groups.get(key);
    if (!g) { g = { t: it.top, b: it.top + it.h, items: [] }; groups.set(key, g); }
    g.items.push(it);
    g.t = Math.min(g.t, it.top);
    g.b = Math.max(g.b, it.top + it.h);
  }
  const left = (g) => Math.min(...g.items.map((i) => i.left));
  const ordered = [...groups.values()].sort((a, b) => a.t - b.t || left(a) - left(b));
  const rows = [];
  for (const g of ordered) {
    const h = g.b - g.t;
    const row = rows.find((r) => { const o = Math.min(r.b, g.b) - Math.max(r.t, g.t); return o > 0.5 * Math.min(r.b - r.t, h); });
    if (row) row.groups.push(g); else rows.push({ t: g.t, b: g.b, groups: [g] });
  }
  rows.sort((a, b) => a.t - b.t);
  return rows.flatMap((r) => r.groups.sort((a, b) => left(a) - left(b)).flatMap((g) => g.items.sort((a, b) => a.top - b.top || a.left - b.left)));
}

function reduce(res, opts) {
  const a = analyse(res, opts);
  const vh = opts.h;
  const line = TRIGGER_PCT * vh + OFFSET;
  const scrolled = a.rows.filter((r) => r.docTop > vh); // below the fold at load: revealed by scrolling
  const resid = scrolled.map((r) => +(r.dist - line).toFixed(1));
  const loadRows = a.rows.filter((r) => r.docTop + r.h <= vh && r.via !== "never");
  const seq = visualOrder(loadRows.map((r) => ({ ...r, top: r.docTop, h: r.h, left: r.left })));
  let orderViolations = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i].visibleStart <= seq[i - 1].visibleStart) orderViolations++;
  return {
    n: a.rows.length, scrolled: scrolled.length,
    fallback: a.rows.filter((r) => r.via === "fallback").length,
    belowLine: scrolled.filter((r, i) => resid[i] < -1).length,
    resMin: resid.length ? Math.min(...resid) : null, resMax: resid.length ? Math.max(...resid) : null,
    rev: a.rows.reduce((s, r) => s + r.rev, 0),
    replays: a.rows.filter((r) => r.plays > 1).length,
    loadOrderViolations: orderViolations, loadN: seq.length,
    hidden0: res.lab.hidden0, stuck: a.stuck.length, stuckList: a.stuck, shifts: a.shifts, perf: a.perf, cdp: res.cdp, errors: res.errors.length, docH: res.docH, rows: a.rows,
  };
}

(async () => {
  const sizes = [...DESK.map((h) => ({ w: 1440, h, mobile: false })), ...MOBILE.map(([w, h]) => ({ w, h, mobile: true }))];
  const all = [];
  for (const page of PAGES) for (const sz of sizes) for (const scen of SCENS) {
    if (process.env.QUICK && !["slow", "fast"].includes(scen) && sz.h !== 700 && sz.h !== 667) continue;
    const opts = { site: SITE, page, ...sz, scen, mode: "trace", throttle: TH };
    if (page === "/schedule" && process.env.PAST !== "0") opts.beforeScroll = async (p) => { await p.click("text=Show Past Races"); await sleep(1500); await p.evaluate(() => document.activeElement && document.activeElement.blur()); };
    let r;
    try { r = reduce(await lab(opts), opts); } catch (e) { r = { error: e.message.slice(0, 100) }; }
    const key = `${page} ${sz.w}x${sz.h}${sz.mobile ? "m" : ""} ${scen}`;
    all.push({ key, ...r });
    const { rows, ...short } = r;
    console.log(key.padEnd(34), r.error ? r.error : `n=${r.n} scrolled=${r.scrolled} fallback=${r.fallback} belowLine=${r.belowLine} resid=[${r.resMin},${r.resMax}] rev=${r.rev} replays=${r.replays} order(load)=${r.loadOrderViolations}/${r.loadN} frames>25=${r.perf.over25} long=${r.perf.longtasks} p95=${r.perf.p95} cls=${r.perf.cls} stuck=${r.stuck} layouts=${r.cdp.layouts} err=${r.errors}`);
  }
  fs.writeFileSync(`${OUT}/${SITE}-${TAG}.json`, JSON.stringify(all));
})();
