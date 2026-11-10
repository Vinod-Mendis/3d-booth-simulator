'use client';

import React, { useState } from 'react';
import * as THREE from 'three';
import { Bookmark, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import type { ViewerMode } from '@/lib/types';
import { Viewpoint, useViewpointsStore } from '@/lib/viewpointsStore';

interface ViewpointsPanelProps {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  orbitTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export const ViewpointsPanel: React.FC<ViewpointsPanelProps> = ({
  mode,
  onModeChange,
  cameraRef,
  orbitTargetRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const viewpoints = useViewpointsStore((s) => s.viewpoints);
  const activeId = useViewpointsStore((s) => s.activeId);
  const { add, rename, remove, goTo } = useViewpointsStore.getState();

  const jumpTo = (vp: Viewpoint) => {
    if (vp.mode !== mode) onModeChange(vp.mode);
    goTo(vp);
  };

  const saveCurrent = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    const position = camera.position;
    const target =
      mode === 'orbit' && orbitTargetRef.current
        ? orbitTargetRef.current.clone()
        : camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(position);

    const count = useViewpointsStore.getState().viewpoints.length;
    const vp = add({
      name: `View ${count + 1}`,
      mode,
      position: [round(position.x), round(position.y), round(position.z)],
      target: [round(target.x), round(target.y), round(target.z)],
    });
    setEditingId(vp.id); // let the user name it straight away
  };

  const step = (delta: 1 | -1) => {
    if (viewpoints.length === 0) return;
    const current = viewpoints.findIndex((v) => v.id === activeId);
    const next =
      current === -1
        ? delta === 1
          ? 0
          : viewpoints.length - 1
        : (current + delta + viewpoints.length) % viewpoints.length;
    jumpTo(viewpoints[next]);
  };

  const iconBtn =
    'p-0.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer disabled:opacity-40 disabled:cursor-default';

  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5 select-none pointer-events-none font-sans">
      <button
        type="button"
        onClick={(e) => {
          setIsOpen((o) => !o);
          e.currentTarget.blur();
        }}
        aria-label="Saved viewpoints"
        aria-expanded={isOpen}
        title="Saved viewpoints"
        className="pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium transition cursor-pointer"
      >
        <Bookmark className="w-3.5 h-3.5" />
        <span>Views{viewpoints.length > 0 ? ` (${viewpoints.length})` : ''}</span>
      </button>

      {isOpen && (
        <div className="pointer-events-auto w-56 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
            <span className="text-[11px] font-medium">Saved views</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={viewpoints.length < 2}
                aria-label="Previous view"
                title="Previous view"
                className={iconBtn}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={viewpoints.length < 2}
                aria-label="Next view"
                title="Next view"
                className={iconBtn}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close saved views"
                className={iconBtn}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-2.5 space-y-2">
            <button
              type="button"
              onClick={saveCurrent}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Save current view</span>
            </button>

            {viewpoints.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                Move the camera where you want it, then save it. Click a view to glide back to it.
              </p>
            ) : (
              <ul className="space-y-0.5 max-h-60 overflow-y-auto">
                {viewpoints.map((vp, i) => (
                  <li
                    key={vp.id}
                    className={`group flex items-center gap-1.5 rounded-[var(--radius-sm)] pl-1.5 pr-1 py-0.5 ${
                      activeId === vp.id ? 'bg-[var(--bg-surface-hover)]' : ''
                    }`}
                  >
                    <span className="w-4 text-[10px] font-mono text-[var(--text-muted)] text-right shrink-0">
                      {i + 1}
                    </span>
                    {editingId === vp.id ? (
                      <input
                        autoFocus
                        defaultValue={vp.name}
                        maxLength={40}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => {
                          const name = e.currentTarget.value.trim();
                          if (name) rename(vp.id, name);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') {
                            e.currentTarget.value = vp.name;
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 min-w-0 px-1 py-0.5 text-[11px] bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-sm)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => jumpTo(vp)}
                        onDoubleClick={() => setEditingId(vp.id)}
                        title={`${vp.name} (${vp.mode} view) — double-click to rename`}
                        className="flex-1 min-w-0 text-left text-[11px] truncate cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {vp.name}
                      </button>
                    )}
                    <span className="text-[9px] uppercase tracking-wide text-[var(--text-muted)] shrink-0">
                      {vp.mode}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(vp.id)}
                      aria-label={`Delete ${vp.name}`}
                      className={`${iconBtn} shrink-0`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
