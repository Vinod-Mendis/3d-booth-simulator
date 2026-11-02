'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Hand, Zap, Play, Pause } from 'lucide-react';
import { useScreensStore } from '@/lib/screensStore';
import { resetTouchInput, touchInput } from '@/lib/touchInput';

const BASE_SIZE = 120;
const KNOB_SIZE = 52;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2 + 10;
const DEAD_ZONE = 0.12;

/**
 * Returns true when the primary input is touch (phones / tablets).
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isTouch;
}

const Joystick: React.FC = () => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  const setKnob = (x: number, y: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const update = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > MAX_RADIUS) {
      dx = (dx / len) * MAX_RADIUS;
      dy = (dy / len) * MAX_RADIUS;
    }
    setKnob(dx, dy);

    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;
    if (Math.hypot(nx, ny) < DEAD_ZONE) {
      touchInput.moveX = 0;
      touchInput.moveY = 0;
    } else {
      touchInput.moveX = nx;
      touchInput.moveY = -ny; // up on screen = forward
    }
  };

  const release = () => {
    pointerId.current = null;
    touchInput.moveX = 0;
    touchInput.moveY = 0;
    setKnob(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        if (pointerId.current !== null) return;
        pointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointerId.current) update(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pointerId.current) release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pointerId.current) release();
      }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Movement joystick"
      role="application"
      style={{ width: BASE_SIZE, height: BASE_SIZE, touchAction: 'none' }}
      className="rounded-full border border-[var(--border-hover)] bg-[var(--bg-surface)]/70 backdrop-blur-sm flex items-center justify-center select-none"
    >
      <div
        ref={knobRef}
        style={{ width: KNOB_SIZE, height: KNOB_SIZE }}
        className="rounded-full bg-[var(--accent)]/80 border border-white/40 pointer-events-none"
      />
    </div>
  );
};

/**
 * On-screen walk controls for touch devices: move joystick (bottom-left),
 * sprint and interact buttons (bottom-right). Look is handled by dragging
 * anywhere else on the canvas (see WalkControls).
 */
export const TouchControls: React.FC = () => {
  const [run, setRun] = useState(false);
  const focusedVideoScreenId = useScreensStore((s) => s.focusedVideoScreenId);
  const focusedWebScreenId = useScreensStore((s) => s.focusedWebScreenId);
  const isPlaying = useScreensStore((s) =>
    s.focusedVideoScreenId ? s.videoRuntime[s.focusedVideoScreenId]?.isPlaying : false
  );
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);

  useEffect(() => {
    touchInput.run = run;
  }, [run]);

  useEffect(() => () => resetTouchInput(), []);

  if (interactiveScreenId) return null;

  const handleInteract = () => {
    const state = useScreensStore.getState();
    if (state.focusedWebScreenId) {
      resetTouchInput();
      state.setInteractiveScreenId(state.focusedWebScreenId);
    } else if (state.focusedVideoScreenId) {
      state.togglePlayPause(state.focusedVideoScreenId);
    }
  };

  const canInteract = !!(focusedVideoScreenId || focusedWebScreenId);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-40 flex items-end justify-between px-4 pointer-events-none"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-auto">
        <Joystick />
      </div>

      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {canInteract && (
          <button
            type="button"
            onClick={handleInteract}
            style={{ touchAction: 'none' }}
            className="h-14 min-w-14 px-3 rounded-full bg-[var(--accent)] text-black text-[12px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            {focusedWebScreenId ? (
              <>
                <Hand className="w-4 h-4" />
                <span>Use</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Play</span>
              </>
            )}
          </button>
        )}
        <button
          type="button"
          aria-pressed={run}
          aria-label="Sprint"
          onClick={() => setRun((r) => !r)}
          style={{ touchAction: 'none' }}
          className={`w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-sm active:scale-95 transition ${
            run
              ? 'bg-[var(--accent)] text-black border-[var(--accent)]'
              : 'bg-[var(--bg-surface)]/70 text-[var(--text-primary)] border-[var(--border-hover)]'
          }`}
        >
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
