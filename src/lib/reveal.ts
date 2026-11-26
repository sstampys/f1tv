/*
 * Reveal engine (matches ye() in officecommun's main-BVZYWS9J.js, with the
 * fade run through the Web Animations API instead of a CSS transition so that
 * no component-level `transition` can swallow it).
 *
 *  - Leaves are elements marked `data-reveal`. An element that contains other
 *    `data-reveal` elements is a wrapper and is never animated itself.
 *  - A leaf is hidden by CSS until it carries `data-in` (an attribute, so a
 *    React re-render that rewrites `class` cannot hide it again).
 *  - ONE IntersectionObserver (root: null) serves every leaf. Entries of one
 *    callback batch are sorted by top, then left; the stagger index is the
 *    position in that sorted batch and is reset per batch.
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
  rootMargin: string;
  settle: number;
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
    rootMargin: get("--motion-reveal-root-margin"),
    settle: num(get("--motion-reveal-settle")),
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

  const markIn = (el: HTMLElement) => el.setAttribute("data-in", "");

  const fadeIn = (el: HTMLElement, index: number) => {
    if (isRevealed(el)) return;
    markIn(el);
    if (still || !tokens) return;
    el.animate(
      [
        { opacity: tokens.opacityFrom, translate: `0 ${tokens.distance}` },
        { opacity: 1, translate: "0 0" },
      ],
      {
        duration: tokens.duration,
        easing: tokens.ease,
        delay: Math.min(index, tokens.cap) * tokens.stagger,
        fill: "backwards",
      },
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

  const byReadingOrder = (a: DOMRectReadOnly, b: DOMRectReadOnly) => a.top - b.top || a.left - b.left;

  const io = new IntersectionObserver(
    (entries) => {
      const batch = entries.filter((entry) => entry.isIntersecting);
      batch.sort((a, b) => byReadingOrder(a.boundingClientRect, b.boundingClientRect));
      batch.forEach((entry, index) => {
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        const wait = whenImagesReady(el);
        if (wait) void wait.then(() => fadeIn(el, index));
        else fadeIn(el, index);
      });
    },
    { root: null, threshold: tokens?.threshold ?? 0, rootMargin: tokens?.rootMargin ?? "0px" },
  );

  const watch = (el: HTMLElement) => {
    if (isRevealed(el)) return;
    if (still) return markIn(el);
    if (isWrapper(el)) return markIn(el);
    io.observe(el);
  };

  let settleTimer: number | undefined;
  const settle = () => {
    settleTimer = undefined;
    const waiting = [...document.querySelectorAll<HTMLElement>(LEAF)].filter((el) => {
      if (isRevealed(el)) return false;
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    waiting.sort((a, b) => byReadingOrder(a.getBoundingClientRect(), b.getBoundingClientRect()));
    waiting.forEach((el, index) => {
      io.unobserve(el);
      fadeIn(el, index);
    });
  };
  const scheduleSettle = () => {
    if (still || !tokens || settleTimer !== undefined) return;
    settleTimer = window.setTimeout(settle, tokens.settle);
  };

  const scan = (root: ParentNode) => {
    if (root instanceof HTMLElement && root.matches(LEAF)) watch(root);
    root.querySelectorAll<HTMLElement>(LEAF).forEach(watch);
    scheduleSettle();
  };

  scan(document);

  const mo = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) scan(node);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // A focused control is never left invisible.
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(INTERACTIVE)) return;
    const leaf = target.closest<HTMLElement>(LEAF);
    if (leaf && !isRevealed(leaf)) {
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
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
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
