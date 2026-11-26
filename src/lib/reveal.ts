/*
 * Reveal engine (matches ye() in officecommun's main-BVZYWS9J.js, with the
 * fade run through the Web Animations API instead of a CSS transition so that
 * no component-level `transition` can swallow it).
 *
 *  - Leaves are elements marked `data-reveal`. An element that contains other
 *    `data-reveal` elements is a wrapper and is never animated itself.
 *  - A leaf is hidden by CSS (opacity only) until it carries `data-in`, an
 *    attribute, so a React re-render that rewrites `class` cannot hide it again.
 *    Because the hidden state has no transform, the observed box is the layout
 *    box: the trigger depends on layout position and nothing else.
 *  - ONE IntersectionObserver (root: null) serves every leaf. Its bottom margin
 *    is the trigger line from the tokens, in px, rebuilt when the viewport
 *    height changes.
 *  - Reveal is one-way: a leaf is unobserved the moment it enters a batch.
 *  - Entries are collected and applied once per frame. A batch is ordered by
 *    visual row (rows by top, cells by left), and the stagger index is the
 *    position in that order, so it is reset per batch and every leaf gets its
 *    own start time.
 *  - All numbers come from CSS custom properties (see :root in styles.css).
 */

export const LEAF = "[data-reveal]";

type Tokens = {
  duration: number;
  ease: string;
  distance: string;
  opacityFrom: number;
  stagger: number;
  cap: number;
  threshold: number;
  trigger: number;
  triggerOffset: number;
  imageWait: number;
  exitDuration: number;
  exitEase: string;
};

const num = (value: string) => {
  const v = value.trim();
  if (!v) return Number.NaN;
  if (v.endsWith("ms")) return parseFloat(v);
  if (v.endsWith("s")) return parseFloat(v) * 1000;
  return parseFloat(v);
};

function readTokens(): Tokens | null {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string) => cs.getPropertyValue(name).trim();
  const tokens: Tokens = {
    duration: num(get("--motion-reveal-duration")),
    ease: get("--motion-reveal-ease"),
    distance: get("--motion-reveal-distance"),
    opacityFrom: parseFloat(get("--motion-reveal-opacity-from")),
    stagger: num(get("--motion-reveal-stagger")),
    cap: parseFloat(get("--motion-reveal-stagger-cap")),
    threshold: parseFloat(get("--motion-reveal-threshold")),
    trigger: parseFloat(get("--motion-reveal-trigger")) / 100,
    triggerOffset: parseFloat(get("--motion-reveal-trigger-offset")),
    imageWait: num(get("--motion-reveal-image-wait")),
    exitDuration: num(get("--motion-exit-duration")),
    exitEase: get("--motion-exit-ease"),
  };
  const ok = Object.values(tokens).every((v) => (typeof v === "number" ? Number.isFinite(v) : v !== ""));
  return ok ? tokens : null;
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isWrapper = (el: Element) => el.querySelector(LEAF) !== null;
const isRevealed = (el: Element) => el.hasAttribute("data-in");

const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Visual reading order: boxes whose vertical ranges overlap by more than half
 * of the shorter one share a row; rows run top to bottom and the boxes inside
 * a row run left to right (right to left on an RTL page).
 */
export function visualOrder<T>(items: T[], box: (item: T) => DOMRectReadOnly, rtl = false): T[] {
  const sorted = [...items].sort((a, b) => box(a).top - box(b).top || box(a).left - box(b).left);
  const rows: Array<{ top: number; bottom: number; cells: T[] }> = [];
  for (const item of sorted) {
    const r = box(item);
    const row = rows.find((candidate) => {
      const overlap = Math.min(candidate.bottom, r.bottom) - Math.max(candidate.top, r.top);
      return overlap > 0.5 * Math.min(candidate.bottom - candidate.top, r.height);
    });
    if (row) row.cells.push(item);
    else rows.push({ top: r.top, bottom: r.bottom, cells: [item] });
  }
  rows.sort((a, b) => a.top - b.top);
  const dir = rtl ? -1 : 1;
  return rows.flatMap((row) => row.cells.sort((a, b) => dir * (box(a).left - box(b).left)));
}

type Engine = {
  stop: () => void;
  leave: () => Promise<void>;
  rearm: () => void;
};

let engine: Engine | null = null;
let exited: Array<{ el: HTMLElement; animation: Animation }> = [];

export function startReveal(): () => void {
  if (typeof window === "undefined") return () => {};
  if (engine) return engine.stop;

  const tokens = readTokens();
  const still = !tokens || prefersReducedMotion();
  const rtl = document.documentElement.dir === "rtl";
  const root = document.documentElement;

  const markIn = (el: HTMLElement) => el.setAttribute("data-in", "");

  const fadeIn = (el: HTMLElement, delay: number) => {
    if (isRevealed(el)) return;
    markIn(el);
    if (still || !tokens) return;
    el.animate(
      [
        { opacity: tokens.opacityFrom, translate: `0 ${tokens.distance}` },
        { opacity: 1, translate: "0 0" },
      ],
      { duration: tokens.duration, easing: tokens.ease, delay, fill: "backwards" },
    );
  };

  const whenImagesReady = (el: HTMLElement): Promise<void> | null => {
    const pending = [...el.querySelectorAll("img")].filter((img) => !img.complete);
    if (!pending.length || !tokens) return null;
    return Promise.race([
      Promise.all(pending.map((img) => img.decode().catch(() => {}))).then(() => {}),
      new Promise<void>((resolve) => window.setTimeout(resolve, tokens.imageWait)),
    ]);
  };

  const triggerLine = () => (tokens ? tokens.trigger * root.clientHeight + tokens.triggerOffset : 0);

  type Queued = { el: HTMLElement; rect: DOMRectReadOnly };
  const pending = new Set<HTMLElement>();
  const armed = new WeakSet<HTMLElement>();
  let queue: Queued[] = [];
  let flushFrame = 0;

  // One batch per frame: order by visual row, then stagger by position. The
  // interval shrinks when the batch is longer than the cap allows, so the
  // whole batch still ends inside cap * stagger and no two leaves start together.
  const flush = () => {
    flushFrame = 0;
    const batch = queue.filter(({ el }) => el.isConnected && !isRevealed(el));
    queue = [];
    if (!batch.length || !tokens) return;
    const ordered = visualOrder(batch, (q) => q.rect, rtl);
    const steps = ordered.length - 1;
    const interval = steps > tokens.cap ? (tokens.cap * tokens.stagger) / steps : tokens.stagger;
    const waits = ordered.map(({ el }) => whenImagesReady(el)).filter((w): w is Promise<void> => w !== null);
    const run = () => ordered.forEach(({ el }, index) => fadeIn(el, index * interval));
    if (waits.length) void Promise.all(waits).then(run);
    else run();
  };
  const scheduleFlush = () => {
    if (!flushFrame) flushFrame = window.requestAnimationFrame(flush);
  };

  let io: IntersectionObserver;

  const onIntersect = (entries: IntersectionObserverEntry[]) => {
    // Layout is clean here (this task follows the rendering update), so the
    // one scrollHeight read per callback costs nothing. It is only needed
    // for leaves that are being seen for the first time.
    let docHeight = -1;
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (!pending.has(el)) continue;
      let reveal = entry.isIntersecting;
      if (!reveal && !armed.has(el)) {
        // A leaf that starts inside the last trigger-line of the page can never
        // be scrolled above the line, so it reveals as soon as it is laid out.
        if (docHeight < 0) docHeight = root.scrollHeight;
        reveal = entry.boundingClientRect.top + window.scrollY > docHeight - triggerLine();
      }
      armed.add(el);
      if (!reveal) continue;
      pending.delete(el);
      io.unobserve(el);
      queue.push({ el, rect: entry.boundingClientRect });
    }
    if (queue.length) scheduleFlush();
  };

  let armedHeight = -1;
  const buildObserver = () => {
    armedHeight = root.clientHeight;
    return new IntersectionObserver(onIntersect, {
      root: null,
      threshold: tokens?.threshold ?? 0,
      rootMargin: `0px 0px -${triggerLine()}px 0px`,
    });
  };
  io = buildObserver();

  // The line is derived from the viewport height, so a changed height (window
  // resize, a collapsing mobile toolbar) rebuilds the observer from the same
  // height it will measure against.
  let resizeFrame = 0;
  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (root.clientHeight === armedHeight) return;
      io.disconnect();
      io = buildObserver();
      pending.forEach((el) => io.observe(el));
    });
  };
  window.addEventListener("resize", onResize);

  const watch = (el: HTMLElement) => {
    if (isRevealed(el) || pending.has(el)) return;
    if (still || document.hidden || isWrapper(el)) return markIn(el);
    armed.delete(el);
    pending.add(el);
    io.observe(el);
  };

  // Added nodes are gathered and armed together once per frame, so everything
  // one commit mounts is observed (and delivered) as one batch.
  let added = new Set<Node>();
  let scanFrame = 0;
  const scan = (node: ParentNode) => {
    if (node instanceof HTMLElement && node.matches(LEAF)) watch(node);
    node.querySelectorAll<HTMLElement>(LEAF).forEach(watch);
  };
  const scheduleScan = () => {
    if (!scanFrame) {
      scanFrame = window.requestAnimationFrame(() => {
        scanFrame = 0;
        const nodes = added;
        added = new Set();
        nodes.forEach((node) => node.isConnected && scan(node as ParentNode));
      });
    }
  };

  scan(document);

  const mo = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) added.add(node);
      });
    }
    if (added.size) scheduleScan();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // A focused control is never left invisible.
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(INTERACTIVE)) return;
    const leaf = target.closest<HTMLElement>(LEAF);
    if (leaf && !isRevealed(leaf)) {
      pending.delete(leaf);
      io.unobserve(leaf);
      markIn(leaf);
    }
  };
  document.addEventListener("focusin", onFocusIn);

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) restoreExit();
  };
  window.addEventListener("pageshow", onPageShow);

  const leave = async () => {
    if (still || !tokens) return;
    const leaves = [...document.querySelectorAll<HTMLElement>(LEAF)].filter(isRevealed);
    exited = leaves.map((el) => ({
      el,
      animation: el.animate(
        [{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }],
        { duration: tokens.exitDuration, easing: tokens.exitEase, fill: "forwards" },
      ),
    }));
    await Promise.all(exited.map(({ animation }) => animation.finished.catch(() => {})));
  };

  // After the next page has rendered: drop the exit fades and let every leaf
  // that survived the route change (the footer) reveal again with the page.
  const rearm = () => {
    restoreExit();
    scan(document);
  };

  engine = {
    stop: () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("resize", onResize);
      if (flushFrame) window.cancelAnimationFrame(flushFrame);
      if (scanFrame) window.cancelAnimationFrame(scanFrame);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      pending.clear();
      engine = null;
    },
    leave,
    rearm,
  };

  function restoreExit() {
    const survivors = exited.filter(({ el }) => el.isConnected);
    exited = [];
    survivors.forEach(({ el, animation }) => {
      animation.cancel();
      el.removeAttribute("data-in");
    });
  }

  return engine.stop;
}

/** Fade every revealed leaf out (opacity only) and resolve when all have finished. */
export function leaveAll(): Promise<void> {
  return engine ? engine.leave() : Promise.resolve();
}

/** Call once the next page is in the DOM. */
export function rearmReveal(): void {
  engine?.rearm();
}

export function exitSafetyMs(): number {
  return num(getComputedStyle(document.documentElement).getPropertyValue("--motion-exit-safety"));
}
