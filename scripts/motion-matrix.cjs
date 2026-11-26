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
  const s = [...items].sort((a, b) => a.top - b.top || a.left - b.left);
  const rows = [];
  for (const it of s) {
    const row = rows.find((r) => { const o = Math.min(r.b, it.top + it.h) - Math.max(r.t, it.top); return o > 0.5 * Math.min(r.h, it.h); });
    if (row) row.items.push(it); else rows.push({ t: it.top, b: it.top + it.h, h: it.h, items: [it] });
  }
  rows.sort((a, b) => a.t - b.t);
  return rows.flatMap((r) => r.items.sort((a, b) => a.left - b.left));
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
