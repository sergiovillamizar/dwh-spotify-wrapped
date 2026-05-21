"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SchemaObject } from "@/types/openapi";

interface JsonViewerProps {
  data: unknown;
  collapsed?: boolean;
  maxHeight?: string;
}

export function JsonViewer({ data, collapsed = false, maxHeight = "400px" }: JsonViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const formatted = formatJson(data);

  return (
    <AnimatePresence initial={false} mode="wait">
      {isCollapsed ? (
        <motion.button
          key="collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setIsCollapsed(false)}
          className="w-full text-left px-4 py-3 rounded-lg bg-spotify-dark-800/50 border border-glass-border text-sm text-spotify-gray hover:bg-spotify-dark-800 transition-colors"
        >
          <motion.span
            animate={{ rotate: 0 }}
            className="inline-block mr-2 text-spotify-green"
          >
            ▶
          </motion.span>
          Response body (click to expand)
        </motion.button>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] as const }}
          className="relative group"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-spotify-dark-800/80 border-b border-glass-border rounded-t-lg">
            <span className="text-[11px] text-spotify-dark-500 uppercase tracking-wider">JSON</span>
            <div className="flex items-center gap-2">
              {collapsed && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsCollapsed(true)}
                  className="text-[11px] text-spotify-gray hover:text-white transition-colors"
                >
                  Collapse
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                className="text-[11px] text-spotify-gray hover:text-white transition-colors"
              >
                Copy
              </motion.button>
            </div>
          </div>
          <pre
            className="overflow-auto rounded-b-lg bg-[#0d0d0d] border border-glass-border border-t-0 p-4 text-xs leading-relaxed"
            style={{ maxHeight }}
          >
            <code dangerouslySetInnerHTML={{ __html: formatted }} />
          </pre>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatJson(data: unknown): string {
  const raw = JSON.stringify(data, null, 2);
  if (!raw) return "";

  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="text-cyan-400">$1</span>:',
    )
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      ': <span class="text-emerald-400">$1</span>',
    )
    .replace(
      /:\s*(\d+\.?\d*)/g,
      ': <span class="text-amber-400">$1</span>',
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="text-purple-400">$1</span>',
    )
    .replace(
      /:\s*(null)/g,
      ': <span class="text-red-400">$1</span>',
    )
    .replace(
      /^(\s*)"(\w+)"\s*:/gm,
      '$1<span class="text-cyan-400">"$2"</span>:',
    );
}

export function SchemaView({ schema }: { schema: SchemaObject }) {
  if (!schema || Object.keys(schema).length === 0) {
    return <span className="text-spotify-dark-500 italic">No schema</span>;
  }

  return (
    <div className="text-xs font-mono space-y-1">
      {schema.type && <span className="text-blue-400">{schema.type}</span>}
      {schema.enum && (
        <span className="text-amber-400"> enum: [{schema.enum.join(", ")}]</span>
      )}
      {schema.description && (
        <p className="text-spotify-gray text-xs font-sans mt-1">{schema.description}</p>
      )}
      {schema.properties && (
        <div className="mt-2 pl-3 border-l border-glass-border space-y-1">
          {Object.entries(schema.properties).map(([name, prop]) => (
            <div key={name}>
              <span className="text-cyan-400">{name}</span>
              {prop.required && <span className="text-red-400 ml-1">*</span>}
              <span className="text-spotify-gray ml-1.5">{prop.type}</span>
              {prop.format && <span className="text-amber-400 ml-1">&lt;{prop.format}&gt;</span>}
              {prop.nullable && <span className="text-red-400 ml-1">nullable</span>}
              {prop.items && (
                <span className="text-spotify-gray ml-1">[array of {prop.items.type ?? "object"}]</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
