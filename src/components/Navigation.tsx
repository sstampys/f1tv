import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";

// CSS for slide-down animation (injected client-side)
const slideDownCSS = `
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-down { animation: slide-down 0.2s var(--ease-glide) ease-out; }
`;

export function Navigation() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Inject slide-down animation CSS client-side
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = slideDownCSS;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const navLinks = [
    { href: "/", label: "Countdown" },
    { href: "/standings", label: "Standings" },
    { href: "/schedule", label: "Schedule" },
  ] as const;

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 backdrop-blur-[16px] backdrop-saturate-160 bg-ground/80 border-b ${scrolled ? "border-hair" : "border-transparent"}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-[1280px] mx-auto px-[24px] h-full flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 font-medium text-ink" aria-label="F1Box Home">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="text-ink">
            <rect width="28" height="28" rx="6" fill="currentColor"/>
            <path d="M8 10h12M8 14h8M8 18h4" stroke="var(--color-ground)" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="text-lg">F1Box</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={`nav-link text-sm font-medium transition-colors ${isActive(href) ? "text-ink" : "text-ink-3"}`}
              aria-current={isActive(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-wash transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {mobileOpen ? (
              <path d="M6 18L18 6M6 6l12 12"/>
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18"/>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-hair bg-ground/95 backdrop-blur-[16px] backdrop-saturate-160 animate-slide-down">
          <div className="px-[24px] py-4 space-y-2">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive(href) ? "bg-wash text-ink" : "text-ink-3 hover:text-ink hover:bg-wash"}`}
                aria-current={isActive(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}