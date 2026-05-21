"use client";

import { motion } from "framer-motion";
import type { HttpMethod } from "@/types/openapi";
import { getMethodColor } from "@/services/openApiService";
import { cn } from "@/lib/utils";

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <motion.span
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase tracking-wider cursor-default transition-shadow duration-200",
        getMethodColor(method),
        className,
      )}
    >
      {method}
    </motion.span>
  );
}
