import { createFileRoute } from "@tanstack/react-router";
import DemoOne from "@/components/ui/demo";

function DemoRoute() {
  return <DemoOne />;
}

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — Countdown" },
      { name: "description", content: "Interactive display demo." },
      { property: "og:title", content: "Demo — Countdown" },
      { property: "og:description", content: "Interactive display demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoRoute,
});