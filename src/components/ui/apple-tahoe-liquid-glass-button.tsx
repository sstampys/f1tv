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
      className={cn("group btn btn-wash", className)}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Button>
  ),
);
LiquidGlassButton.displayName = "LiquidGlassButton";