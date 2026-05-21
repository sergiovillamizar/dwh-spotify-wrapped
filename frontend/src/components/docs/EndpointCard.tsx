"use client";

import { useState } from "react";
import type { EndpointInfo } from "@/types/openapi";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { JsonViewer } from "@/components/docs/JsonViewer";
import { TryItPanel } from "@/components/docs/TryItPanel";

interface EndpointCardProps {
  endpoint: EndpointInfo;
  isActive?: boolean;
}

export function EndpointCard({ endpoint, isActive }: EndpointCardProps) {
  const { method, path, operation } = endpoint;
  const [showTryIt, setShowTryIt] = useState(false);
  const [showDetails, setShowDetails] = useState(isActive ?? false);

  const exampleResponse = operation.responses?.["200"] ?? operation.responses?.["201"] ?? operation.responses?.["default"];

  return (
    <>
      <div
        className={`
          glass rounded-xl transition-all duration-300
          ${showDetails ? "ring-1 ring-spotify-green/20" : "hover:bg-glass-hover"}
        `}
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left px-4 sm:px-5 py-3 sm:py-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <MethodBadge method={method} className="mt-0.5 shrink-0 text-[10px] sm:text-xs" />
            <div className="flex-1 min-w-0">
              <code className="text-xs sm:text-sm font-mono text-white/90 break-all leading-relaxed">{path}</code>
              {operation.summary && (
                <p className="text-[11px] sm:text-xs text-spotify-gray mt-1 line-clamp-1">{operation.summary}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-spotify-dark-500 transition-transform duration-200 ${
                  showDetails ? "rotate-180" : ""
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>
        </button>

        {showDetails && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 animate-slide-up">
            {operation.description && operation.description !== operation.summary && (
              <div className="text-xs text-spotify-gray leading-relaxed border-l-2 border-glass-border pl-3">
                {operation.description}
              </div>
            )}

            {operation.deprecated && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <span>⚠</span> This endpoint is deprecated
              </div>
            )}

            {operation.parameters && operation.parameters.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold text-spotify-gray uppercase tracking-wider mb-2">
                  Parameters ({operation.parameters.length})
                </h4>
                <div className="space-y-1">
                  {operation.parameters.map((param) => (
                    <div
                      key={param.name}
                      className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-spotify-dark-800/50 text-xs"
                    >
                      <code className="text-white font-mono text-[11px]">{param.name}</code>
                      <span className="text-[10px] uppercase text-spotify-dark-500">{param.in}</span>
                      {param.required && (
                        <span className="text-red-400 text-[10px]">required</span>
                      )}
                      <span className="text-spotify-gray ml-auto font-mono text-[10px]">
                        {param.schema.type}
                        {param.schema.format && ` <${param.schema.format}>`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {operation.requestBody && (
              <div>
                <h4 className="text-[11px] font-semibold text-spotify-gray uppercase tracking-wider mb-2">
                  Request Body
                  {operation.requestBody.required && <span className="text-red-400 ml-1">*</span>}
                </h4>
                <JsonViewer
                  data={operation.requestBody.content?.["application/json"]?.example ?? {}}
                  collapsed={true}
                  maxHeight="160px"
                />
              </div>
            )}

            {exampleResponse && (
              <div>
                <h4 className="text-[11px] font-semibold text-spotify-gray uppercase tracking-wider mb-2">
                  Response {exampleResponse.description && `— ${exampleResponse.description}`}
                </h4>
                <JsonViewer
                  data={exampleResponse.content?.["application/json"]?.example ?? {}}
                  collapsed={true}
                  maxHeight="160px"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowTryIt(true)}
                className="flex-1 py-2.5 rounded-xl bg-spotify-green text-black font-semibold text-sm hover:bg-spotify-green-hover transition-all active:scale-[0.98]"
              >
                Try it
              </button>
            </div>
          </div>
        )}
      </div>

      {showTryIt && (
        <TryItPanel
          method={method}
          path={path}
          operation={operation}
          onClose={() => setShowTryIt(false)}
        />
      )}
    </>
  );
}
