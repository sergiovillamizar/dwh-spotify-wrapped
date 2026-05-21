"use client";

import { motion } from "framer-motion";

interface WidgetSlotProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  colSpan?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const colSpanMap: Record<string, string> = {
  sm: "sm:col-span-1",
  md: "sm:col-span-1 lg:col-span-1",
  lg: "lg:col-span-2",
  xl: "lg:col-span-2 xl:col-span-2",
  "2xl": "xl:col-span-3",
  full: "col-span-full",
};

export function WidgetSlot({ title, description, children, className, colSpan }: WidgetSlotProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const }}
      className={cn(
        "glass rounded-2xl overflow-hidden flex flex-col",
        colSpan ? colSpanMap[colSpan] : "",
        className,
      )}
    >
      <div className="px-5 pt-5 pb-3 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-white tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-spotify-gray mt-0.5">
          {description}
        </p>
      </div>
      <div className="flex-1 p-5 pt-4">
        {children}
      </div>
    </motion.section>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
