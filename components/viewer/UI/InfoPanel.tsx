'use client';

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadedModelData } from '@/lib/types';

interface InfoPanelProps {
  modelData: LoadedModelData | null;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ modelData }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!modelData) return null;

  const width = modelData.scaledSize.x.toFixed(2);
  const depth = modelData.scaledSize.z.toFixed(2);
  const height = modelData.scaledSize.y.toFixed(2);
  const triangles = modelData.triangleCount.toLocaleString();

  return (
    <div className="absolute bottom-3 left-3 z-20 w-64 select-none pointer-events-auto font-sans">
      <div className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="text-[11px] font-medium truncate" title={modelData.name}>
              {modelData.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand model details' : 'Collapse model details'}
            className="p-0.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Panel Body */}
        {!isCollapsed && (
          <div className="p-2.5 space-y-1.5 text-[11px]">
            {/* Dimensions Grid */}
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-subtle)]">
                <div className="text-[9px] text-[var(--text-muted)] uppercase">W (X)</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{width}m</div>
              </div>
              <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-subtle)]">
                <div className="text-[9px] text-[var(--text-muted)] uppercase">D (Z)</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{depth}m</div>
              </div>
              <div className="p-1 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-subtle)]">
                <div className="text-[9px] text-[var(--text-muted)] uppercase">H (Y)</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{height}m</div>
              </div>
            </div>

            {/* Triangles & Units */}
            <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Triangles: <span className="font-mono text-[var(--text-secondary)]">{triangles}</span></span>
              <span>Unit: <span className="font-mono text-[var(--text-secondary)] uppercase">{modelData.detectedUnit}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
