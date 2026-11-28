import { Link, useLocation } from "@tanstack/react-router";
import { useStreamPlaying } from "@/lib/stream-status";
import { prefetchResource } from "@/lib/data/use-resource";
import { seasonsRes, scheduleRes, driverStandingsRes } from "@/lib/jolpica-api";
import { currentYear } from "@/lib/data/config";
import { applyTheme, storeTheme } from "@/lib/theme";
import { useSeason } from "@/lib/season";
import { useFocusRing } from "@/lib/focus-visible";

const links = [
  { href: "/", label: "Countdown" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
] as const;

/** Prefetch a link's data on intent, respecting the cache and the limiter. */
function prefetchFor(href: string, season?: string) {
  // The countdown is always about the running season; the season routes show
  // the season the visitor picked.
  const year = href === "/" ? currentYear() : season || currentYear();
  prefetchResource(seasonsRes);
  if (href === "/standings") prefetchResource(driverStandingsRes(year));
  else prefetchResource(scheduleRes(year)); // "/" and "/schedule" share the schedule
}

export function Navigation() {
  const location = useLocation();
  const streamPlaying = useStreamPlaying();
  // The season on screen, so the pill carries it to the next page.
  const season = useSeason();
  // The theme switch shows its focus indicator for keyboard users only.
  const focusRing = useFocusRing();

  // The logo in the pill is the theme switch. It reads the live class so it
  // always flips from what is actually applied.
  const toggleTheme = () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
  };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <button
        type="button"
        onClick={toggleTheme}
        className="site-nav__home"
        aria-label="Toggle color theme"
        style={{ "--i": 0 }}
        {...focusRing}
      >
        <span className="site-nav__mark" aria-hidden="true" />
      </button>
      {links.map(({ href, label }, index) => {
        // While a stream is playing the countdown entry is the live one.
        const live = href === "/" && streamPlaying;
        // The season routes keep the season the visitor is looking at.
        const search = href === "/" || !season ? undefined : { season };
        return (
          <Link
            key={href}
            to={href}
            search={search}
            aria-current={location.pathname === href ? "page" : undefined}
            data-live={live ? "true" : undefined}
            className="site-nav__link"
            style={{ "--i": index + 1 }}
            onPointerEnter={() => prefetchFor(href, season)}
            onFocus={() => prefetchFor(href, season)}
          >
            {live ? "Live" : label}
          </Link>
        );
      })}
    </nav>
  );
}
