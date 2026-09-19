import { FloatingPathsBackground } from "@/components/ui/floating-paths";

export default function FloatingPathsBackgroundExample() {
  return (
    <FloatingPathsBackground
      className="aspect-video flex items-center justify-center"
      position={-1}
    >
      <span className="sr-only">Floating paths background</span>
    </FloatingPathsBackground>
  );
}