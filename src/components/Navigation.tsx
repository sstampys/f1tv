import { Link, useLocation } from "@tanstack/react-router";
import { useStreamPlaying } from "@/lib/stream-status";
import { prefetchResource } from "@/lib/data/use-resource";
import { seasonsRes, scheduleRes, driverStandingsRes } from "@/lib/jolpica-api";
import { currentYear } from "@/lib/data/config";

const links = [
  { href: "/", label: "Countdown" },
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
] as const;

/** Prefetch a link's data on intent, respecting the cache and the limiter. */
function prefetchFor(href: string) {
  const year = currentYear();
  prefetchResource(seasonsRes);
  if (href === "/standings") prefetchResource(driverStandingsRes(year));
  else prefetchResource(scheduleRes(year)); // "/" and "/schedule" share the schedule
}

export function Navigation() {
  const location = useLocation();
  const streamPlaying = useStreamPlaying();
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <Link to="/" className="site-nav__home" aria-label="F1Box Home" style={{ "--i": 0 }}>
        <img src="/logo.svg" alt="" aria-hidden="true" className="site-nav__mark" />
      </Link>
      {links.map(({ href, label }, index) => {
        // While a stream is playing the countdown entry is the live one.
        const live = href === "/" && streamPlaying;
        return (
          <Link
            key={href}
            to={href}
            aria-current={location.pathname === href ? "page" : undefined}
            data-live={live ? "true" : undefined}
            className="site-nav__link"
            style={{ "--i": index + 1 }}
            onPointerEnter={() => prefetchFor(href)}
            onFocus={() => prefetchFor(href)}
          >
            {live ? "Live" : label}
          </Link>
        );
      })}
    </nav>
  );
}
