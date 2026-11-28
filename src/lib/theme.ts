/**
 * Theme engine. One place decides the theme, writes the html attributes the
 * CSS reads, and keeps `color-scheme` and the theme-color meta in step.
 *
 *  - The dark palette lives in styles.css under `.dark` / `[data-theme="dark"]`.
 *  - A blocking inline script (themeInitScript) applies the saved choice — or
 *    the system preference — before first paint, so there is no wrong-theme flash.
 *  - The toggle and the live system listener are the only other writers, and
 *    both go through applyTheme, so the root element stays the single source
 *    of truth for light and dark appearance.
 *  - With no saved choice the theme keeps following the system setting: the
 *    mounted ThemeController listens for live color-scheme changes while
 *    nothing is stored, so the device's appearance updates the page in real time.
 *
 *  Theme changes cross-fade as a single coordinated transition on the root
 *  element: view transitions on browsers that support them, and a root-level
 *  opacity cross-fade (Web Animations API) everywhere else — for example older
 *  mobile WKWebView browsers that lack startViewTransition. No per-element
 *  colour transitions are used.
 */

export type Theme = "light" | "dark";

/**
 * localStorage key for the user's explicit choice.
 *
 * The theme follows the operating system's light/dark setting until the
 * visitor picks one with the logo in the navigation pill; that choice is then
 * remembered here. The key is versioned so the system setting is the default
 * for everyone: choices stored under an older key are ignored.
 */
export const THEME_STORAGE_KEY = "theme-pref";

/** Browser-chrome colours, matching --paper in each theme. */
export const THEME_COLOR_LIGHT = "#fcfcfc";
export const THEME_COLOR_DARK = "#171717";

/** Read the saved choice. Returns null if unset or storage is blocked. */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

/** Persist the choice. Silently no-ops when storage is blocked. */
export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage can be blocked; the choice just will not persist */
  }
}

/** The current system preference, defaulting to light. */
export function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** The theme a fresh load should show: saved choice, else the system. */
export function resolvedTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

const num = (value: string) => {
  const v = value.trim();
  if (!v) return Number.NaN;
  if (v.endsWith("ms")) return parseFloat(v);
  if (v.endsWith("s")) return parseFloat(v) * 1000;
  return parseFloat(v);
};

/** The theme fade duration, read from the shared --t-theme token. */
function themeDuration(): number {
  return num(getComputedStyle(document.documentElement).getPropertyValue("--t-theme").trim());
}

/** The theme fade easing, read from the shared --ease token. */
function themeEase(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--ease").trim() || "ease";
}

/** Write the theme attributes to the root element (the single source of truth). */
function applyThemeAttributes(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }
}

/**
 * Write a theme to the document and cross-fade the whole page as one
 * coordinated transition on the root element.
 *
 *  - With `startViewTransition` the swap runs inside a view transition: the
 *    old snapshot stays visible and the new one fades in on top
 *    (see styles.css ::view-transition-old/new(root)).
 *  - Without view transitions (older mobile WKWebView, etc.) a root-level
 *    opacity cross-fade runs through the Web Animations API: content fades
 *    out, the theme swaps on the root while invisible, content fades back in.
 *    No per-element colour transitions are involved.
 *  - With reduced motion or animate === false the theme is written straight
 *    away, with no animation.
 */
export function applyTheme(theme: Theme, animate = true): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const reduce =
    !animate ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const ease = themeEase();

  const commit = () => {
    // Freeze transitions for the frame the colours change in, then release
    // two frames later so every colour lands at once.
    root.setAttribute("data-theme-switching", "");
    applyThemeAttributes(theme);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.removeAttribute("data-theme-switching")),
    );
  };

  if (reduce) {
    commit();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> };
  };

  // View transition path: snapshot cross-fade, coordinated on the root element.
  if (typeof doc.startViewTransition === "function") {
    const write = () => {
      root.setAttribute("data-theme-switching", "");
      applyThemeAttributes(theme);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.removeAttribute("data-theme-switching")),
      );
    };
    try {
      const vt = doc.startViewTransition(write);
      // A transition that is skipped or aborted can reject before the update
      // callback ran: re-apply the theme so the page never stays in the old
      // one. `write` runs at most once, so a transition that was superseded by
      // a newer one can never pull the page back to the older theme.
      vt.ready.catch(() => {
        try {
          write();
        } catch {
          /* nothing else to do: the DOM write already failed */
        }
      });
      vt.finished.catch(() => {});
    } catch {
      write();
    }
    return;
  }

  // Fallback: single root-level opacity cross-fade for browsers without view
  // transitions. The whole page fades out, the theme swaps on the root while
  // invisible, then fades back in — one coordinated transition, no abrupt cut.
  root.setAttribute("data-theme-switching", "");
  void (async () => {
    const duration = themeDuration();
    try {
      await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration / 2, easing: ease })
        .finished;
      applyThemeAttributes(theme);
      await root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration / 2, easing: ease })
        .finished;
    } finally {
      root.removeAttribute("data-theme-switching");
    }
  })();
}

/**
 * Subscribe to live operating-system color-scheme changes. Only meaningful
 * when the visitor has not made an explicit choice: the handler re-applies
 * the system theme whenever the device appearance changes, so the default
 * mode follows the OS in real time rather than being locked in at load.
 * Returns an unsubscribe function.
 */
export function observeSystemTheme(apply: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    // An explicit manual override always wins over the system setting.
    if (readStoredTheme()) return;
    apply(systemTheme());
  };
  if (mq.addEventListener) mq.addEventListener("change", handler);
  else if (mq.addListener) mq.addListener(handler);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", handler);
    else if (mq.removeListener) mq.removeListener(handler);
  };
}

/**
 * Blocking head script. Reads the saved choice (guarded), falls back to the
 * system, and sets the class, marker, color-scheme and theme-color before the
 * first paint. Keeps following the system while nothing is stored via the
 * mounted ThemeController (see observeSystemTheme), so there is a single
 * live listener instead of one in the script and one in React. One line so
 * it stays a cheap inline script. The storage key is injected from
 * THEME_STORAGE_KEY so the script and the app can never disagree.
 */
export const themeInitScript = `(function(){try{var e=document.documentElement;var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=null;try{var v=localStorage.getItem(k);if(v==="dark"||v==="light")s=v}catch(a){}var m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;var set=function(t){e.dataset.theme=t;if(t==="dark")e.classList.add("dark");else e.classList.remove("dark");e.style.colorScheme=t;var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute("content",t==="dark"?"#171717":"#fcfcfc")};var apply=function(){set(s||(m&&m.matches?"dark":"light"))};apply();}catch(c){}})();`;
