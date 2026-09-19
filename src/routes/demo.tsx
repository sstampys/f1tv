import { createFileRoute } from "@tanstack/react-router";
import DemoOne from "@/components/ui/demo";

function DemoRoute() {
  return <DemoOne />;
}

export const Route = createFileRoute("/demo")({
  component: DemoRoute,
});