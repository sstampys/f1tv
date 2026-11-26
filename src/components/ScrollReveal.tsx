import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { exitSafetyMs, leaveAll, rearmReveal, startReveal } from "@/lib/reveal";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Mounts the shared reveal engine once and turns every page change into
 * "fade the current leaves out, then navigate, then reveal the next page".
 *
 * The exit hooks the router's history blocker, which @tanstack/history awaits
 * for PUSH, REPLACE, BACK, FORWARD and GO alike, so links, the router API and
 * the browser's back/forward buttons all take the same path. A second
 * navigation that starts while an exit is running is ignored.
 */
export function ScrollReveal() {
  const router = useRouter();

  useEffect(() => {
    const stopReveal = startReveal();

    let leaving = false;
    let exited = false;
    let renderedPath = router.state.location.pathname;

    // The next page's heading may only exist once its data has loaded, so
    // focus moves to it as soon as it appears, unless the user has moved on.
    let stopFocusWatch = () => {};
    const focusHeading = () => {
      stopFocusWatch();
      const active = document.activeElement;
      const idle = !active || active === document.body || !!active.closest("nav");
      const place = () => {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (!heading) return false;
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        return true;
      };
      if (!idle || place()) return;
      const watcher = new MutationObserver(() => {
        if (place()) stopFocusWatch();
      });
      watcher.observe(document.body, { childList: true, subtree: true });
      const stopOnInput = () => stopFocusWatch();
      document.addEventListener("keydown", stopOnInput, { once: true });
      document.addEventListener("pointerdown", stopOnInput, { once: true });
      stopFocusWatch = () => {
        watcher.disconnect();
        document.removeEventListener("keydown", stopOnInput);
        document.removeEventListener("pointerdown", stopOnInput);
        stopFocusWatch = () => {};
      };
    };

    const arrive = () => {
      const path = router.state.location.pathname;
      if (!exited && path === renderedPath) return;
      renderedPath = path;
      if (exited) rearmReveal();
      exited = false;
      focusHeading();
    };

    const unblock = router.history.block({
      enableBeforeUnload: false,
      blockerFn: async ({ currentLocation, nextLocation, action }) => {
        if (reducedMotion() || currentLocation.pathname === nextLocation.pathname) return false;
        if (leaving) return true;
        stopFocusWatch();
        leaving = true;
        try {
          await Promise.race([
            leaveAll(),
            new Promise<void>((resolve) => window.setTimeout(resolve, exitSafetyMs())),
          ]);
          exited = true;
          if (action === "PUSH" || action === "REPLACE") window.scrollTo(0, 0);
        } finally {
          leaving = false;
        }
        return false;
      },
    });

    const offRendered = router.subscribe("onRendered", arrive);
    const offResolved = router.subscribe("onResolved", () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(arrive));
    });

    return () => {
      stopFocusWatch();
      offRendered();
      offResolved();
      unblock();
      stopReveal();
    };
  }, [router]);

  return null;
}
