"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function FloatingPathsBackground({
  position,
  children,
  className,
}: {
  position: number;
  className?: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    opacity: 0.08 + i * 0.018,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className={cn("relative isolate overflow-hidden bg-background", className)}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <svg
          className="h-full w-full text-foreground"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <title>Animated flowing paths</title>
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.opacity}
              initial={{ pathLength: 0.3, opacity: 0.35 }}
              animate={
                prefersReducedMotion
                  ? { pathLength: 1, pathOffset: 0, opacity: 0.55 }
                  : {
                      pathLength: [0.3, 1, 0.3],
                      pathOffset: [0, 0.2, 0],
                      opacity: [0.35, 0.75, 0.35],
                    }
              }
              transition={{
                duration: 18 + (path.id % 8),
                repeat: prefersReducedMotion ? 0 : Infinity,
                ease: "linear",
              }}
            />
          ))}
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}