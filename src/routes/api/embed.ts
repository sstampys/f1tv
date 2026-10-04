import { createFileRoute } from "@tanstack/react-router";

// Proxy for third-party stream embeds.
//
// The embed provider (embedindia.st) runs an anti-sandbox detector: on the
// first click inside an iframe it tries window.open(), and when the popup is
// blocked (as happens inside the sandboxed Lovable preview) it replaces the
// player with a red "Remove sandbox attributes on the iframe tag" overlay.
//
// We can't add attributes to the editor's preview frame, so instead we serve
// the embed page through this same-origin route and inject a small script
// (before the provider's bundle) that makes window.open() return a harmless
// fake window. The detector then believes popups work and never shows the
// overlay. A <base> tag keeps the page's relative URLs pointing at the
// provider so the player itself loads unchanged.

const ALLOWED_HOSTS = ["embedindia.st"];

const PATCH_SCRIPT = `<script>(function(){var d={open:function(){},writeln:function(){},write:function(){},close:function(){}};var w={document:d,closed:false,close:function(){},focus:function(){},blur:function(){},location:{href:"about:blank"},opener:null};window.open=function(){return w;};})();</script>`;

export const Route = createFileRoute("/api/embed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const reqUrl = new URL(request.url);
        const target = reqUrl.searchParams.get("url");
        if (!target) return new Response("Missing url", { status: 400 });

        let targetUrl: URL;
        try {
          targetUrl = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        const host = targetUrl.hostname.toLowerCase();
        if (
          targetUrl.protocol !== "https:" ||
          !ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
        ) {
          return new Response("Host not allowed", { status: 403 });
        }

        const upstream = await fetch(targetUrl.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!upstream.ok) {
          return new Response("Upstream error", { status: 502 });
        }

        let html = await upstream.text();
        const base = `<base href="${targetUrl.origin}/">`;
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head([^>]*)>/i, `<head$1>${base}${PATCH_SCRIPT}`);
        } else {
          html = base + PATCH_SCRIPT + html;
        }

        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
