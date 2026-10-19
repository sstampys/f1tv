import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const ANIMATE_COUNT_DURATION_MS = 450;
const EASING = [0.23, 0.88, 0.26, 0.92] as const;

export interface AnimateCountProps {
  children: number;
  animate?: boolean;
  className?: string;
  minDigits?: number;
}

export function AnimateCount({ children: count, animate = true, className, minDigits = 1 }: AnimateCountProps) {
  const reducedMotion = useReducedMotion();
  const previousCount = useRef(count);
  const [prev, setPrev] = useState<number | null>(null);
  const shouldAnimate = animate && !reducedMotion;

  useEffect(() => {
    if (previousCount.current !== count) {
      setPrev(shouldAnimate ? previousCount.current : null);
      previousCount.current = count;
    }
    if (!shouldAnimate) setPrev(null);
  }, [count, shouldAnimate]);

  const format = (value: number) => String(value).padStart(minDigits, "0");
  const transition = { duration: shouldAnimate ? ANIMATE_COUNT_DURATION_MS / 1000 : 0, ease: EASING };

  return (
    <div aria-hidden="true" className={cn("grid place-items-center tabular-nums [&>*]:col-start-1 [&>*]:row-start-1", className)}>
      <AnimatePresence initial={false}>
        {shouldAnimate && prev !== null && prev !== count && (
          <motion.div
            key={`exit-${prev}-${count}`}
            initial={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            animate={{ opacity: 0, filter: "blur(2px)", y: -12 }}
            transition={transition}
            onAnimationComplete={() => setPrev(null)}
          >
            {format(prev)}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        key={`enter-${count}`}
        initial={shouldAnimate ? { opacity: 0, filter: "blur(2px)", y: 8 } : false}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={transition}
      >
        {format(count)}
      </motion.div>
    </div>
  );
}

export default AnimateCount;