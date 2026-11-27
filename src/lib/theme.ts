/**
 * Theme engine. One place decides the theme, writes the html attributes the
 * CSS reads, and keeps `color-scheme` and the theme-color meta in step.
 *
 *  - The dark palette lives in styles.css under `.dark` / `[data-theme="dark"]`.
 *  - A blocking inline script (themeInitScript) applies the saved choice — or
 *    the system preference — before first paint, so there is no wrong-theme flash.
 *  - The toggle is the only other writer, and it calls applyTheme/storeTheme.
 *  - With no saved choice the theme keeps following the system setting (the
 *    inline script listens for changes while nothing is stored).
 */

export type Theme = "light" | "dark";

/** localStorage key for the user's explicit choice. */
export const THEME_STORAGE_KEY = "theme";

/** Browser-chrome colours, matching --paper in each theme. */
export const THEME_COLOR_LIGHT = "#fcfcfc";
export const THEME_COLOR_DARK = "#171717";

/** How long the colour fade runs; the class is kept a little longer than that. */

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

/**
 * Write a theme to the document: the `dark` class (drives the CSS and the dark
 * Tailwind variant), the `data-theme` marker (needed so the no-JS
 * prefers-color-scheme fallback stops applying once JS has decided),
 * `color-scheme`, and the theme-color meta.
 *
 * When the browser supports view transitions the swap runs inside one, so the
 * page fades as a whole: the old snapshot stays visible and the new one fades
 * in on top (see styles.css). Without support — or with reduced motion — the
 * theme is written straight away, with no animation.
 */
export function applyTheme(theme: Theme, animate = true): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const reduce =
    !animate ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // The update callback runs at most once, so a transition that was
  // superseded can never undo the newer theme.
  let applied = false;
  const write = () => {
    // Freeze transitions for the frame the colours change in, then release
    // two frames later so every colour lands at once.
    root.setAttribute("data-theme-switching", "");
    try {
      root.classList.toggle("dark", theme === "dark");
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
      }
      applied = true;
    } finally {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.removeAttribute("data-theme-switching")),
      );
    }
  };

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> };
  };
  if (reduce || typeof doc.startViewTransition !== "function") {
    write();
    return;
  }
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
}

/**
 * Blocking head script. Reads the saved choice (guarded), falls back to the
 * system, and sets the class, marker, color-scheme and theme-color before the
 * first paint. Keeps following the system while nothing is stored. One line so
 * it stays a cheap inline script.
 */
export const themeInitScript = `(function(){try{var e=document.documentElement;var s=null;try{var v=localStorage.getItem("theme");if(v==="dark"||v==="light")s=v}catch(a){}var m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;var set=function(t){e.dataset.theme=t;if(t==="dark")e.classList.add("dark");else e.classList.remove("dark");e.style.colorScheme=t;var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute("content",t==="dark"?"#171717":"#fcfcfc")};var apply=function(){set(s||(m&&m.matches?"dark":"light"))};apply();if(!s&&m){var h=function(){var n=null;try{var w=localStorage.getItem("theme");if(w==="dark"||w==="light")n=w}catch(b){}if(n)return;apply()};if(m.addEventListener)m.addEventListener("change",h);else if(m.addListener)m.addListener(h)}}catch(c){}})();`;
