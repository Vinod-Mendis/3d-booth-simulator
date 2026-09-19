'use client';

import React from 'react';
import { ViewerMode } from '@/lib/types';

interface HintChipsProps {
  mode: ViewerMode;
  isDark: boolean;
  hasModel: boolean;
}

export const HintChips: React.FC<HintChipsProps> = ({ mode, isDark, hasModel }) => {
  if (!hasModel) return null;

  return (
    <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center pointer-events-none select-none px-4">
      <div
        className={`pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full border backdrop-blur-md shadow-lg text-[11px] font-medium transition-all ${
          isDark
            ? 'bg-slate-950/75 border-slate-800/80 text-slate-300 shadow-black/30'
            : 'bg-white/80 border-slate-200 text-slate-700 shadow-slate-300/30'
        }`}
      >
        {mode === 'orbit' ? (
          <>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Left drag</kbd>
              <span>Rotate</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Right drag</kbd>
              <span>Pan</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Scroll</kbd>
              <span>Zoom</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Click / Drag</kbd>
              <span>Look</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">W A S D / Arrows</kbd>
              <span>Move</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Shift</kbd>
              <span>Run</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 border border-slate-500/20">Esc</kbd>
              <span>Release mouse</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
