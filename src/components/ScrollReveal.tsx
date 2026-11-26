import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

export function ScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const revealAll = (instant = false) => {
      const els = [...document.querySelectorAll<HTMLElement>("[data-reveal], .reveal, .rise")];
      // Sort by document position (top-left to bottom-right reading order)
      els.sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return ra.top - rb.top || ra.left - rb.left;
      });
      els.forEach((el, i) => {
        if (el.classList.contains("is-in")) return;
        el.style.setProperty("--d", instant ? "0ms" : `${Math.min(i, 8) * 60}ms`);
        el.classList.add("is-in");
      });
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || document.hidden) {
      document.documentElement.classList.add("is-still");
      revealAll(true);
      return;
    }

    // Immediately reveal ALL elements currently in DOM, staggered.
    revealAll(false);

    // Catch dynamically-added reveal targets (standings rows, races, etc.)
    const mo = new MutationObserver(() => revealAll(false));
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: after data settles, force-reveal anything still hidden.
    const t = window.setTimeout(() => revealAll(true), 1000);

    return () => {
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [location.pathname]);

  return null;
}