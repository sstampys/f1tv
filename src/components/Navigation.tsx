import { Link, useLocation } from "@tanstack/react-router";
export function Navigation() {
  const location = useLocation();
  const links = [{href:"/",label:"Countdown"},{href:"/standings",label:"Standings"},{href:"/schedule",label:"Schedule"}] as const;
  return <nav className="site-nav" aria-label="Main navigation">
    <Link to="/" className="site-nav__home" aria-label="F1Box Home" data-reveal>
      <img src="/logo.svg" alt="" aria-hidden="true" className="site-nav__mark" />
      <span className="site-nav__brand">FormJ</span>
    </Link>
    {links.map(({href,label})=><Link key={href} to={href} aria-current={location.pathname===href?"page":undefined} data-reveal>{label}</Link>)}
  </nav>;
}
