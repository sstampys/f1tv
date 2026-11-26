import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "@/components/Navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="page">
      <section className="rows">
        <div className="page-container stack-tight">
          <h1 data-reveal>404</h1>
          <p className="mute" data-reveal>Page not found</p>
          <p className="mute" data-reveal>The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <div className="page-container">
          <Link to="/" className="link" data-reveal>Go home</Link>
        </div>
      </section>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="page">
      <section className="rows">
        <div className="page-container stack-tight">
          <h1 data-reveal>This page didn't load</h1>
          <p className="mute" data-reveal>
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
        </div>
        <div className="page-container head" style={{ justifyContent: "flex-start", columnGap: "var(--s3)" }}>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="control"
            data-reveal
          >
            Try again
          </button>
          <Link to="/" className="link" data-reveal>Go home</Link>
        </div>
      </section>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#fcfcfc" },
      { title: "F1Box" },
      { name: "description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
      { name: "author", content: "F1Box" },
      { property: "og:title", content: "F1Box — Formula 1 Live Timing & Streams" },
      { property: "og:description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "F1Box — Formula 1 Live Timing & Streams" },
      { name: "twitter:description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
    ],
    scripts: [
      {
        children: `(function(){try{var h=document.documentElement;if(!sessionStorage.getItem('f1box-nav-seen')){h.classList.add('first-visit');sessionStorage.setItem('f1box-nav-seen','1')}}catch(e){}})();`,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
        <noscript>
          <style>{`
            html [data-reveal]:not([data-in]) {
              opacity: 1;
            }
          `}</style>
        </noscript>
      </head>
      <body className="bg-ground text-ink min-h-screen flex flex-col">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <ScrollReveal />
      <main className="flex-1">
        <Outlet />
      </main>
      {pathname !== "/legal" && (
        <footer className="site-footer">
          <div className="page-container">
            <Link to="/legal" data-reveal>
              Privacy &amp; Legal
            </Link>
          </div>
        </footer>
      )}
    </QueryClientProvider>
  );
}