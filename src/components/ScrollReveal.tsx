import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

export function ScrollReveal() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hidden = document.hidden;

    if (reduced || hidden) {
      // Instant visibility for reduced motion / hidden tabs — no animation.
      document.documentElement.classList.add("is-still");
      document.querySelectorAll<HTMLElement>("[data-reveal], .reveal, .rise").forEach((el) => {
        el.classList.add("is-in");
      });
      return;
    }

    // Measured motion values from officecommun.com.
    const rootStyle = getComputedStyle(document.documentElement);
    const parseMs = (value: string, fallback: number) => {
      const n = parseFloat(value);
      return Number.isFinite(n) ? n : fallback;
    };
    const staggerMs = parseMs(rootStyle.getPropertyValue("--motion-reveal-stagger"), 60);
    const threshold = parseMs(rootStyle.getPropertyValue("--motion-reveal-threshold"), 0);
    const rootMargin =
      rootStyle.getPropertyValue("--motion-reveal-root-margin").trim() || "0px 0px -6% 0px";

    const seen = new WeakSet<Element>();

    // Wait for images inside an element before revealing it (700ms fallback).
    const waitForImages = (el: HTMLElement): Promise<void> => {
      return new Promise((resolve) => {
        const imgs = el.querySelectorAll("img");
        if (imgs.length === 0) {
          resolve();
          return;
        }
        let loaded = 0;
        const total = imgs.length;
        const done = () => {
          loaded += 1;
          if (loaded === total) resolve();
        };
        imgs.forEach((img) => {
          if (img.complete) {
            done();
          } else {
            img.addEventListener("load", done, { once: true });
            setTimeout(done, 700);
          }
        });
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        // Sort intersecting entries by top/left -> reading order
        // (user requirement: top-left to bottom-right).
        const visible = entries.filter((e) => e.isIntersecting);
        visible.sort((a, b) => {
          const ra = a.boundingClientRect;
          const rb = b.boundingClientRect;
          return ra.top - rb.top || ra.left - rb.left;
        });

        visible.forEach(async (entry, i) => {
          const el = entry.target as HTMLElement;
          if (el.classList.contains("is-in")) return;
          io.unobserve(el);

          await waitForImages(el);

          // Stagger: index * staggerMs, capped at 8 elements (max 480 ms).
          // Resets per callback batch, never accumulates across scrolls.
          el.style.setProperty("--d", `${Math.min(i, 8) * staggerMs}ms`);
          el.classList.add("is-in");
        });
      },
      { threshold, rootMargin },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal], .reveal, .rise").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();

    // Observe dynamically-added reveal targets (async data: standings rows, races, etc.).
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    // Fallback: force-reveal elements already in the viewport after layout settles.
    const fallback = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal], .reveal, .rise").forEach((el) => {
        if (el.classList.contains("is-in")) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    };
    const t = setTimeout(fallback, 1200);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [location.pathname]);

  return null;
}