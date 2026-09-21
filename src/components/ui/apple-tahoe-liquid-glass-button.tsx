"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LiquidGlassViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  bgImage?: string;
  fallbackMode?: "webgl" | "blur";
  children?: React.ReactNode;
}

export interface LiquidGlassButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

export const LiquidGlassViewport = React.forwardRef<HTMLDivElement, LiquidGlassViewportProps>(
  ({ bgImage, className, children, style, fallbackMode: _fallbackMode, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        ...style,
        ...(bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover" } : {}),
      }}
      {...props}
    >
      {children}
    </div>
  ),
);
LiquidGlassViewport.displayName = "LiquidGlassViewport";

export const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ className, children, type = "button", ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      className={cn(
        "group relative h-11 overflow-hidden rounded-full border border-white/30 bg-white/10 px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150",
        "transition-[background-color,border-color,transform,box-shadow] duration-200 hover:scale-[1.02] hover:border-white/50 hover:bg-white/15 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/70",
        "before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.22),transparent_48%)]",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Button>
  ),
);
LiquidGlassButton.displayName = "LiquidGlassButton";