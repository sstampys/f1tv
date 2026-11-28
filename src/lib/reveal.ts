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


/**
 * Run the reveal keyframes on one leaf. Only opacity and transform animate;
 * translate3d with a whole-pixel distance keeps text from snapping at the end.
 * The layer is already promoted by the `[data-reveal]` rule in styles.css, so
 * it is on the compositor before the animation starts and stays there while
 * the page scrolls (a promotion set in this frame would be too late for
 * WebKit to composite the animation).
 */
function animateLeaf(el: HTMLElement, tokens: Tokens, delay: number): Animation {
  const px = Math.round(parseFloat(tokens.distance)) || 0;
  const y = el.getAttribute("data-reveal") === "down" ? -px : px;
  return el.animate(
    [
      { opacity: tokens.opacityFrom, transform: `translate3d(0, ${y}px, 0)` },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ],
    { duration: tokens.duration, easing: tokens.ease, delay, fill: "backwards" },
  );
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isWrapper = (el: Element) => el.querySelector(LEAF) !== null;
const isRevealed = (el: Element) => el.hasAttribute("data-in");

const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Visual reading order: boxes whose vertical ranges overlap by more than half
 * of the shorter one share a row; rows run top to bottom and the boxes inside
 * a row run left to right (right to left on an RTL page).
 *
 * `cell` groups leaves that belong to one container of several lines — for
 * example a countdown column, the numeral above its unit letter. The lines of a
 * cell are kept together and the cell is banded as a single box, so the order
 * runs cell by cell instead of putting every numeral before every letter.
 */
export function visualOrder<T>(
  items: T[],
  box: (item: T) => DOMRectReadOnly,
  rtl = false,
  cell?: (item: T) => unknown,
): T[] {
  const cellOf = cell ?? ((item: T) => item);
  const byKey = new Map<unknown, { items: T[]; top: number; bottom: number; left: number }>();
  const groups: Array<{ items: T[]; top: number; bottom: number; left: number }> = [];
  for (const item of items) {
    const key = cellOf(item);
    const r = box(item);
    let group = byKey.get(key);
    if (!group) {
      group = { items: [], top: r.top, bottom: r.bottom, left: r.left };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
    group.top = Math.min(group.top, r.top);
    group.bottom = Math.max(group.bottom, r.bottom);
    group.left = Math.min(group.left, r.left);
  }

  const ordered = [...groups].sort((a, b) => a.top - b.top || a.left - b.left);
  const rows: Array<{ top: number; bottom: number; groups: typeof groups }> = [];
  for (const group of ordered) {
    const height = group.bottom - group.top;
    const row = rows.find((candidate) => {
      const overlap = Math.min(candidate.bottom, group.bottom) - Math.max(candidate.top, group.top);
      return overlap > 0.5 * Math.min(candidate.bottom - candidate.top, height);
    });
    if (row) row.groups.push(group);
    else rows.push({ top: group.top, bottom: group.bottom, groups: [group] });
  }
  rows.sort((a, b) => a.top - b.top);
  const dir = rtl ? -1 : 1;
  return rows.flatMap((row) =>
    row.groups
      .sort((a, b) => dir * (a.left - b.left))
      .flatMap((group) => group.items.sort((a, b) => box(a).top - box(b).top || dir * (box(a).left - box(b).left))),
  );
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

  // `data-in` is all the reveal needs: styles.css keeps every `[data-reveal]`
  // leaf promoted (will-change + font smoothing) from mount, so nothing has to
  // be written to the element's inline style while the page scrolls.
  const markIn = (el: HTMLElement) => {
    el.setAttribute("data-in", "");
  };

  const fadeIn = (el: HTMLElement, delay: number) => {
    if (isRevealed(el)) return;
    markIn(el);
    if (still || !tokens) return;
    animateLeaf(el, tokens, delay);
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
    const ordered = visualOrder(batch, (q) => q.rect, rtl, (q) => q.el.parentElement);
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
    // In a switched-in list (`data-instant` fades the block in, `data-immediate`
    // shows it with no animation) only the leaves already in view are shown at
    // once; rows still below the fold keep the normal scroll reveal.
    // This check MUST come before the `still` check so that switched-in content
    // animates regardless of the `prefers-reduced-motion` setting.
    if (el.closest("[data-instant], [data-immediate]")) {
      const line = tokens ? tokens.trigger * root.clientHeight + tokens.triggerOffset : 0;
      if (el.getBoundingClientRect().top < root.clientHeight - line) return markIn(el);
    }
    if (still || document.hidden || isWrapper(el)) return markIn(el);
    armed.delete(el);
    pending.add(el);
    io.observe(el);
  };

  // Added nodes are gathered and armed together once per frame, so everything
  // one commit mounts is observed (and delivered) as one batch. Removed nodes
  // are forgotten in the same frame so a data change (switching season, tab)
  // cannot leave detached leaves observed forever, growing the pending set.
  let added = new Set<HTMLElement>();
  let removed = new Set<HTMLElement>();
  let scanFrame = 0;
  const scan = (node: ParentNode) => {
    if (node instanceof HTMLElement && node.matches(LEAF)) watch(node);
    node.querySelectorAll<HTMLElement>(LEAF).forEach(watch);
  };
  const forget = (node: ParentNode) => {
    const leaves = [
      ...(node instanceof HTMLElement && node.matches(LEAF) ? [node] : []),
      ...node.querySelectorAll<HTMLElement>(LEAF),
    ];
    leaves.forEach((el) => {
      if (!el.isConnected && pending.has(el)) {
        pending.delete(el);
        io.unobserve(el);
      }
    });
  };
  const scheduleScan = () => {
    if (!scanFrame) {
      scanFrame = window.requestAnimationFrame(() => {
        scanFrame = 0;
        const pendingAdded = added;
        const pendingRemoved = removed;
        added = new Set();
        removed = new Set();
        pendingAdded.forEach((node) => node.isConnected && scan(node));
        pendingRemoved.forEach((node) => forget(node));
        // A container can be mounted in one commit and finished in the next
        // (a table skeleton, then its header cells). One follow-up pass catches
        // leaves that only appeared just after the first scan, so a header row
        // can never be left sitting at opacity 0.
        if (pendingAdded.size) {
          window.requestAnimationFrame(() => {
            pendingAdded.forEach((node) => node.isConnected && scan(node));
          });
        }
      });
    }
  };

  scan(document);

  const mo = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) added.add(node);
      });
      record.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) removed.add(node);
      });
    }
    if (added.size || removed.size) scheduleScan();
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

/**
 * Play the reveal fade on one element immediately, marking it revealed at the
 * same moment. Used for table headers: they are chrome that must be visible
 * from the first paint, but should still arrive with the same motion as the
 * rows instead of popping in.
 */
export function playReveal(el: HTMLElement | null, delay = 0): void {
  if (!el) return;
  el.setAttribute("data-in", "");
  const tokens = readTokens();
  if (!tokens || prefersReducedMotion()) return;
  animateLeaf(el, tokens, delay);
}

/** Broadcast just before the page's exit fade begins. */
export const PAGE_EXIT_EVENT = "f1box:exit";

/** The snapshot overlays currently fading out, so a newer one can drop them. */
let snapshots: HTMLElement[] = [];

/**
 * Fade a copy of `target` out where it sits, without touching the live list.
 *
 * The copy is a fixed-position clone appended to the body (so React never
 * removes it and it does not affect layout), fading from 1 to 0 over the exit
 * tokens. The live list is swapped in the same frame, so the outgoing list
 * dissolves over the incoming one with no delay before the interaction.
 *
 * Only opacity animates (compositor-friendly); the clone takes no pointer
 * events, so the control underneath stays clickable throughout.
 */
export function fadeOutSnapshot(target: HTMLElement | null): void {
  if (!target) return;
  const tokens = readTokens();
  if (!tokens) return;

  // A newer snapshot supersedes any still fading.
  snapshots.forEach((node) => node.remove());
  snapshots = [];

  const rect = target.getBoundingClientRect();
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-instant");
  clone.removeAttribute("data-immediate");
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText = [
    "position:fixed",
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    "overflow:hidden",
    "pointer-events:none",
    "z-index:5",
    "will-change:opacity",
  ].join(";");
  document.body.appendChild(clone);
  snapshots.push(clone);

  const animation = clone.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: tokens.exitDuration,
    easing: tokens.exitEase,
    fill: "forwards",
  });
  const drop = () => {
    clone.remove();
    snapshots = snapshots.filter((node) => node !== clone);
  };
  animation.finished.then(drop, drop);
}

/**
 * Fade the revealed leaves inside `root` out (same exit tokens the page
 * transition uses) and resolve when they are gone.
 *
 * Used when one list replaces another — switching season, switching tab, or
 * collapsing a list — so the swap reads like a page change instead of jumping.
 * The caller swaps state in `.then()`; the incoming list mounts fresh, so the
 * reveal engine fades it in with the normal stagger.
 *
 * `lift` moves the leaves up by that many pixels as they fade, mirroring the
 * way a list revealed with `data-reveal="down"` dropped into place. Only
 * opacity and an integer-pixel transform animate, so the exit stays on the
 * compositor; the default (0) is the plain fade every other caller expects.
 */
export function fadeOutList(root: HTMLElement | null, scope = LEAF, lift = 0): Promise<void> {
  if (!root) return Promise.resolve();
  const tokens = readTokens();
  if (!tokens) return Promise.resolve();

  const els = [...root.querySelectorAll<HTMLElement>(scope)].filter(isRevealed);
  if (!els.length) return Promise.resolve();

  const up = Math.round(parseFloat(tokens.distance)) || 0;
  const rise = lift > 0 ? up : 0;

  const animations = els.map((el) =>
    el.animate(
      rise
        ? [
            { opacity: getComputedStyle(el).opacity, transform: "translate3d(0, 0px, 0)" },
            { opacity: 0, transform: `translate3d(0, ${-rise}px, 0)` },
          ]
        : [{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }],
      { duration: tokens.exitDuration, easing: tokens.exitEase, fill: "forwards" },
    ),
  );

  return Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
    // Any leaf that survived the swap (React reused the node) must not stay
    // invisible: drop our fade once the new list has painted.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => animations.forEach((a) => a.cancel()));
    });
  });
}
/** Fade every revealed leaf out (opacity only) and resolve when all have finished. */
export function leaveAll(): Promise<void> {
  // Menus listen for this and close without animating, so nothing is left
  // floating above the page while it fades out.
  window.dispatchEvent(new Event(PAGE_EXIT_EVENT));
  return engine ? engine.leave() : Promise.resolve();
}

/** Call once the next page is in the DOM. */
export function rearmReveal(): void {
  engine?.rearm();
}

export function exitSafetyMs(): number {
  return num(getComputedStyle(document.documentElement).getPropertyValue("--motion-exit-safety"));
}
