'use client';

import React from 'react';
import { Box, FolderOpen, Zap } from 'lucide-react';

interface EmptyStateProps {
  onOpenFile: () => void;
  onTrySample: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenFile,
  onTrySample,
}) => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none select-none font-sans">
      <div className="pointer-events-auto max-w-sm w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 text-[var(--text-primary)]">
        {/* Header with Icon */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight">Open 3D Model</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Select a file or use the sample booth</p>
          </div>
        </div>

        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-4">
          Drag and drop a <code>.glb</code> or <code>.gltf</code> file directly onto the window, or choose an action below.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={onOpenFile}
            aria-label="Choose 3D model file from disk [Ctrl+O]"
            className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Choose File</span>
          </button>

          <button
            type="button"
            onClick={onTrySample}
            aria-label="Load built-in sample booth"
            className="flex-1 h-8 px-3 rounded-[var(--radius-sm)] text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            <span>Sample Booth</span>
          </button>
        </div>

        {/* Formats Note */}
        <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] space-y-1">
          <div className="font-medium text-[var(--text-secondary)]">Formats</div>
          <div>Supported: <code>.glb</code>, <code>.gltf</code> with textures and bin.</div>
        </div>
      </div>
    </div>
  );
};
