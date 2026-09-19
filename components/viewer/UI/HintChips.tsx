'use client';

import React from 'react';
import { ViewerMode } from '@/lib/types';

interface HintChipsProps {
  mode: ViewerMode;
  hasModel: boolean;
}

export const HintChips: React.FC<HintChipsProps> = ({ mode, hasModel }) => {
  if (!hasModel) return null;

  return (
    <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center pointer-events-none select-none px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-[11px] font-sans">
        {mode === 'orbit' ? (
          <>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">L-Drag</kbd>
              <span>Rotate</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">R-Drag</kbd>
              <span>Pan</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">Wheel</kbd>
              <span>Zoom</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">R</kbd>
              <span>Reset</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">Click</kbd>
              <span>Look</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">WASD</kbd>
              <span>Move</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">Shift</kbd>
              <span>Sprint</span>
            </span>
            <span className="text-[var(--border-default)]">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded-[var(--radius-sm)] text-[10px] font-mono bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)]">Esc</kbd>
              <span>Unlock</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
