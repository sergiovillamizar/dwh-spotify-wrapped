"use client";

import { motion } from "framer-motion";
import type { EndpointGroup } from "@/types/openapi";
import { EndpointCard } from "@/components/docs/EndpointCard";

interface EndpointListProps {
  group: EndpointGroup;
  activeEndpointKey?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function EndpointList({ group, activeEndpointKey }: EndpointListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
      >
        <h2 className="text-base sm:text-lg font-bold text-white capitalize">{group.tag}</h2>
        <span className="text-[10px] sm:text-[11px] text-spotify-dark-500 bg-spotify-dark-800 px-2 py-0.5 rounded-full border border-glass-border shrink-0">
          {group.endpoints.length} {group.endpoints.length === 1 ? "endpoint" : "endpoints"}
        </span>
      </motion.div>

      {group.endpoints.map((ep) => {
        const key = `${ep.method}-${ep.path}`;
        return (
          <motion.div key={key} variants={itemVariants}>
            <EndpointCard
              endpoint={ep}
              isActive={activeEndpointKey === key}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
