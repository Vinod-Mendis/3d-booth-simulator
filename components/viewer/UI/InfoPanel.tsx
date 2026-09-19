'use client';

import React, { useState } from 'react';
import { LoadedModelData } from '@/lib/types';

interface InfoPanelProps {
  modelData: LoadedModelData | null;
  isDark: boolean;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ modelData, isDark }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!modelData) return null;

  const width = modelData.scaledSize.x.toFixed(2);
  const depth = modelData.scaledSize.z.toFixed(2);
  const height = modelData.scaledSize.y.toFixed(2);
  const triangles = modelData.triangleCount.toLocaleString();

  return (
    <div className="absolute bottom-4 left-4 z-20 max-w-xs sm:max-w-sm w-full select-none pointer-events-auto">
      <div
        className={`rounded-xl border backdrop-blur-md shadow-lg transition-all duration-200 overflow-hidden ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80 text-slate-200 shadow-black/40'
            : 'bg-white/85 border-slate-200 text-slate-800 shadow-slate-300/40'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-inherit">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-xs font-semibold truncate" title={modelData.name}>
              {modelData.name}
            </h3>
            {modelData.isSample && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">
                Sample
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-md transition text-slate-400 hover:text-slate-200 cursor-pointer`}
            title={isCollapsed ? 'Expand model details' : 'Collapse model details'}
          >
            <svg
              className={`w-3.5 h-3.5 transform transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Panel Body */}
        {!isCollapsed && (
          <div className="p-3.5 space-y-2.5 text-xs">
            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                className={`p-2 rounded-lg border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Wide (X)</div>
                <div className="font-mono font-medium mt-0.5">{width} m</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Deep (Z)</div>
                <div className="font-mono font-medium mt-0.5">{depth} m</div>
              </div>
              <div
                className={`p-2 rounded-lg border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tall (Y)</div>
                <div className="font-mono font-medium mt-0.5">{height} m</div>
              </div>
            </div>

            {/* Triangles & Units */}
            <div className="flex items-center justify-between pt-1 border-t border-inherit text-[11px] text-slate-400">
              <span>Triangles: <strong className="font-mono text-slate-300 font-semibold">{triangles}</strong></span>
              <span>Unit: <strong className="font-mono text-slate-300 font-semibold uppercase">{modelData.detectedUnit}</strong></span>
            </div>

            {/* Phase 2 Screen Detection */}
            {modelData.screens.length > 0 && (
              <div className="pt-2 border-t border-inherit space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-sky-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Detected Screens ({modelData.screens.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Phase 2 Target</span>
                </div>
                <div className="space-y-1">
                  {modelData.screens.map((screen) => (
                    <div
                      key={screen.name}
                      className={`px-2 py-1.5 rounded text-[11px] font-mono flex items-center justify-between ${
                        isDark ? 'bg-sky-950/40 text-sky-200 border border-sky-900/40' : 'bg-sky-50 text-sky-800 border border-sky-200'
                      }`}
                    >
                      <span className="truncate font-semibold">{screen.name}</span>
                      <span className="text-[10px] text-sky-400 shrink-0 ml-2">
                        {screen.width}m × {screen.height}m ({screen.aspectRatio})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
