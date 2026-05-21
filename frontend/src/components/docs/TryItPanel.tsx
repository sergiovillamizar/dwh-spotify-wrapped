"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Operation, HttpMethod, ApiResponse } from "@/types/openapi";
import { executeRequest, generateCurl } from "@/services/apiService";
import { JsonViewer } from "@/components/docs/JsonViewer";
import { useToast } from "@/components/ui/Toast";

interface TryItPanelProps {
  method: HttpMethod;
  path: string;
  operation: Operation;
  onClose: () => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { y: "100%", opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, damping: 25, stiffness: 300, mass: 0.8 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function TryItPanel({ method, path, operation, onClose }: TryItPanelProps) {
  const { addToast } = useToast();
  const [params, setParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState(() => getDefaultBody(operation));
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const pathParams = operation.parameters?.filter((p) => p.in === "path") ?? [];
  const queryParams = operation.parameters?.filter((p) => p.in === "query") ?? [];

  function resolvePath(p: string): string {
    let resolved = p;
    for (const param of pathParams) {
      resolved = resolved.replace(`{${param.name}}`, params[param.name] || `{${param.name}}`);
    }
    return resolved;
  }

  async function handleSend() {
    setLoading(true);
    setResponse(null);
    try {
      const result = await executeRequest(method, resolvePath(path), params, body || undefined);
      setResponse(result);
      if (result.status >= 200 && result.status < 300) {
        addToast("success", `${method.toUpperCase()} ${path} — ${result.status}`);
      } else {
        addToast("error", `${method.toUpperCase()} ${path} — ${result.status}`);
      }
    } catch {
      addToast("error", "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCurl() {
    const curl = generateCurl(method, resolvePath(path), params, body || undefined);
    navigator.clipboard.writeText(curl);
    addToast("info", "cURL copied to clipboard");
  }

  const hasBody = !!operation.requestBody;

  return (
    <motion.div
      key="tryit-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        key="tryit-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full sm:max-w-2xl mx-0 sm:mx-4 max-h-[90vh] bg-[#0d0d0d] border border-glass-border rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Try API endpoint"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-glass-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Try it</h2>
            <p className="text-xs text-spotify-gray font-mono mt-0.5 truncate max-w-[200px] sm:max-w-none">
              {method.toUpperCase()} {path}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyCurl}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-spotify-dark-800 border border-glass-border text-spotify-gray hover:text-white transition-colors"
              aria-label="Copy cURL command"
            >
              cURL
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 text-spotify-gray hover:text-white transition-colors rounded-lg hover:bg-glass-hover"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {(pathParams.length > 0 || queryParams.length > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-xs font-semibold text-spotify-gray uppercase tracking-wider">Parameters</h3>
              {[...pathParams, ...queryParams].map((param, i) => (
                <motion.div
                  key={param.name}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.25 }}
                  className="space-y-1"
                >
                  <label className="flex items-center gap-2 text-xs text-spotify-gray">
                    <code className="text-white font-mono">{param.name}</code>
                    <span className="text-[10px] text-spotify-dark-500">{param.in}</span>
                    {param.required && <span className="text-red-400">required</span>}
                  </label>
                  {param.description && (
                    <p className="text-[11px] text-spotify-dark-500">{param.description}</p>
                  )}
                  <input
                    type="text"
                    value={params[param.name] ?? ""}
                    onChange={(e) =>
                      setParams((prev) => ({ ...prev, [param.name]: e.target.value }))
                    }
                    placeholder={param.schema.example ? String(param.schema.example) : param.name}
                    className="w-full bg-spotify-dark-800 border border-glass-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-spotify-dark-500 focus:outline-none focus:border-spotify-green/50 focus:ring-1 focus:ring-spotify-green/30 transition-all duration-200"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {hasBody && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-xs font-semibold text-spotify-gray uppercase tracking-wider">Request Body</h3>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full bg-spotify-dark-800 border border-glass-border rounded-lg px-3 sm:px-4 py-3 text-xs font-mono text-white placeholder-spotify-dark-500 focus:outline-none focus:border-spotify-green/50 focus:ring-1 focus:ring-spotify-green/30 resize-y transition-all duration-200"
              />
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSend}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-spotify-green text-black font-semibold text-sm hover:bg-spotify-green-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2"
              >
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </motion.span>
            ) : (
              `Send ${method.toUpperCase()} Request`
            )}
          </motion.button>

          <AnimatePresence>
            {response && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-spotify-gray uppercase tracking-wider">Response</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" as const, stiffness: 400, damping: 15 }}
                      className={`px-2 py-0.5 rounded font-mono ${
                        response.status >= 200 && response.status < 300
                          ? "bg-emerald-500/10 text-emerald-400"
                          : response.status >= 400
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {response.status}
                    </motion.span>
                    <span className="text-spotify-dark-500">{response.duration}ms</span>
                  </div>
                </div>
                <JsonViewer data={response.body} maxHeight="280px" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getDefaultBody(operation: Operation): string {
  if (!operation.requestBody) return "";
  const content = operation.requestBody.content?.["application/json"];
  if (!content) return "{}";
  const example = content.example;
  if (example) return JSON.stringify(example, null, 2);
  if (content.schema?.example) return JSON.stringify(content.schema.example, null, 2);
  if (content.schema?.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(content.schema.properties)) {
      if (prop.example !== undefined) obj[key] = prop.example;
      else if (prop.type === "string") obj[key] = "string";
      else if (prop.type === "integer" || prop.type === "number") obj[key] = 0;
      else if (prop.type === "boolean") obj[key] = false;
      else if (prop.type === "array") obj[key] = [];
      else obj[key] = null;
    }
    return JSON.stringify(obj, null, 2);
  }
  return "{}";
}
