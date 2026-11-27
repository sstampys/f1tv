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
const THEME_TRANSITION_MS = 250;
let switchTimer: ReturnType<typeof setTimeout> | undefined;

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
 */
export function applyTheme(theme: Theme, animate = true): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // During an interactive switch, mark the document so the colour transitions
  // (and only those) run. Skipped for reduced motion, and never on first paint.
  const reduce =
    !animate ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!reduce) root.classList.add("theme-switching");

  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }

  if (!reduce) {
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => root.classList.remove("theme-switching"), THEME_TRANSITION_MS + 60);
  }
}

/**
 * Blocking head script. Reads the saved choice (guarded), falls back to the
 * system, and sets the class, marker, color-scheme and theme-color before the
 * first paint. Keeps following the system while nothing is stored. One line so
 * it stays a cheap inline script.
 */
export const themeInitScript = `(function(){try{var e=document.documentElement;var s=null;try{var v=localStorage.getItem("theme");if(v==="dark"||v==="light")s=v}catch(a){}var m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;var set=function(t){e.dataset.theme=t;if(t==="dark")e.classList.add("dark");else e.classList.remove("dark");e.style.colorScheme=t;var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute("content",t==="dark"?"#171717":"#fcfcfc")};var apply=function(){set(s||(m&&m.matches?"dark":"light"))};apply();if(!s&&m){var h=function(){var n=null;try{var w=localStorage.getItem("theme");if(w==="dark"||w==="light")n=w}catch(b){}if(n)return;apply()};if(m.addEventListener)m.addEventListener("change",h);else if(m.addListener)m.addListener(h)}}catch(c){}})();`;
