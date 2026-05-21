"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-spotify-green text-black font-bold hover:bg-spotify-green-hover active:scale-[0.98]",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  outline:
    "border border-glass-border bg-glass text-white hover:bg-glass-hover",
  secondary: "bg-spotify-dark-700 text-white hover:bg-spotify-dark-600",
  ghost: "text-spotify-gray hover:text-white hover:bg-glass-hover",
  link: "text-spotify-green underline-offset-4 hover:underline",
} as const;

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-lg px-3 text-sm",
  lg: "h-12 rounded-xl px-8 text-base",
  xl: "h-14 rounded-2xl px-10 text-lg",
  icon: "h-10 w-10",
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spotify-green/50 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, type ButtonProps, type Variant, type Size };
