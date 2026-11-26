import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const parseMs = (value: string, fallback: number) => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };

    const staggerMs = parseMs(rootStyle.getPropertyValue("--motion-reveal-stagger"), 150);
    const delayMs = parseMs(rootStyle.getPropertyValue("--motion-reveal-delay"), 50);
    const threshold = (() => {
      const n = parseFloat(rootStyle.getPropertyValue("--motion-reveal-threshold"));
      return Number.isFinite(n) ? n : 0.08;
    })();
    const rootMargin =
      rootStyle.getPropertyValue("--motion-reveal-root-margin").trim() || "0px 0px -6% 0px";

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        visible.sort((a, b) => {
          const ra = a.boundingClientRect;
          const rb = b.boundingClientRect;
          return ra.top - rb.top || ra.left - rb.left;
        });
        visible.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty("--d", `${delayMs + i * staggerMs}ms`);
          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { threshold, rootMargin }
    );

    const scan = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (!el.classList.contains("rise") && !el.classList.contains("reveal")) {
          el.classList.add("reveal");
        }
        io.observe(el);
      });
      // Also observe existing .rise elements that don't have data-reveal
      document.querySelectorAll(".rise:not([data-reveal])").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
