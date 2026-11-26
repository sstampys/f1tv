import { Link, useLocation } from "@tanstack/react-router";
export function Navigation() {
  const location = useLocation();
  const links = [{href:"/",label:"Countdown"},{href:"/standings",label:"Standings"},{href:"/schedule",label:"Schedule"}] as const;
  return <nav className="site-nav" aria-label="Main navigation">
    <Link to="/" aria-label="F1Box Home"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect width="28" height="28" rx="6" fill="currentColor"/><path d="M8 10h12M8 14h8M8 18h4" stroke="var(--paper)" strokeWidth="2.5" strokeLinecap="round"/></svg>F1Box</Link>
    {links.map(({href,label})=><Link key={href} to={href} aria-current={location.pathname===href?"page":undefined}>{label}</Link>)}
  </nav>;
}
