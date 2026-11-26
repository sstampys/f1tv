import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "@/components/Navigation";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-ink-3">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="btn btn-ink"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-ink"
          >
            Try again
          </button>
          <Link to="/" className="btn btn-wash">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#fcfcfc" },
      { title: "F1Box — Formula 1 Live Timing & Streams" },
      { name: "description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
      { name: "author", content: "F1Box" },
      { property: "og:title", content: "F1Box — Formula 1 Live Timing & Streams" },
      { property: "og:description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "F1Box — Formula 1 Live Timing & Streams" },
      { name: "twitter:description", content: "Live Formula 1 countdown, standings, schedule, and race results." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
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

  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="quiet-footer">
        <p>Built with TanStack Start &amp; Tailwind CSS</p>
        <p>
          Formula 1 championship data is sourced from the{' '}
          <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer">
            Jolpica-F1 API
          </a>{' '}
          and live stream links are aggregated from{' '}
          <a href="https://ppv.st" target="_blank" rel="noopener noreferrer">ppv.st</a>. No media is stored on our servers.
        </p>
      </footer>
    </QueryClientProvider>
  );
}
