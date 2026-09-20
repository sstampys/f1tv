import { Starfield } from "@/components/ui/starfield";

export default function DemoOne() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <Starfield
        starCount={10000}
        waveFrequency={15}
        starEscapeWidth={400}
        voidWidth={80}
        starColor={{ r: 234, g: 179, b: 8 }}
        maxOpacity={200}
        rotationSpeed={0.0002}
        waveSpeed={0.005}
      />
 <span className="pointer-events-none absolute z-10 text-center text-7xl leading-none font-semibold tracking-tighter whitespace-pre-wrap">
        Starfield
      </span>
    </div>
  );
}