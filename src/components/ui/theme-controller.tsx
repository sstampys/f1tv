import { useEffect } from "react";
import { applyTheme, observeSystemTheme, readStoredTheme, resolvedTheme } from "@/lib/theme";

/**
 * Single unified theme controller, mounted once at the root.
 *
 * It is the only place that subscribes to the live operating-system
 * color-scheme, and it only does so while the visitor has not made an
 * explicit manual choice (no stored theme). Whenever the device's light or
 * dark setting changes, the root element is re-themed through applyTheme, so
 * the default mode follows the OS in real time instead of being locked in at
 * load. A manual toggle (Navigation) writes through the same applyTheme and
 * stores the choice, after which this controller defers to it.
 *
 * The root element (document.documentElement) remains the single source of
 * truth: this controller only reads it and writes to it, never holds a
 * separate React theme state, so there is no state to drift out of sync.
 */
export function ThemeController() {
  useEffect(() => {
    const root = document.documentElement;
    const want = resolvedTheme();
    // Fix any hydration mismatch instantly; when the inline script already
    // painted the right theme (the common case) nothing is written, so no
    // animation is frozen on load.
    if (root.classList.contains("dark") !== (want === "dark")) {
      applyTheme(want, false);
    }

    // While there is no explicit stored choice, follow live system changes.
    if (readStoredTheme()) return undefined;
    return observeSystemTheme((theme) => {
      applyTheme(theme);
    });
  }, []);

  return null;
}
