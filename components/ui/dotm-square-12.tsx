'use client';

import type { CSSProperties } from 'react';
import { useSyncExternalStore } from 'react';

export interface DotmSquare12Props {
  /** Outer grid size in px */
  size?: number;
  /** Dot diameter in px */
  dotSize?: number;
  /** Animation speed multiplier */
  speed?: number;
  /** Soft glow around the dots */
  bloom?: boolean;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
}

const GRID = 5;
// Ripple origin is cell (2,2) in a 1-based 5x5 grid => (row 1, col 1) zero-based
const ORIGIN_ROW = 1;
const ORIGIN_COL = 1;
const MAX_MANHATTAN = 6;
const CYCLE_SECONDS = 1.6;

const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 5x5 dot matrix that ripples outward from an off-center origin by Manhattan distance.
 * Pure CSS animation (see .dmx-ripple in globals.css); falls back to a static gradient
 * of opacities under prefers-reduced-motion.
 */
export function DotmSquare12({
  size = 32,
  dotSize = 4,
  speed = 1,
  bloom = false,
  animated = true,
  className = '',
  ariaLabel = 'Loading',
}: DotmSquare12Props) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const gap = Math.max(0, (size - dotSize * GRID) / (GRID - 1));
  const duration = CYCLE_SECONDS / Math.max(speed, 0.1);
  const run = animated && !reducedMotion;

  const dots = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const ring = Math.min(MAX_MANHATTAN, Math.abs(row - ORIGIN_ROW) + Math.abs(col - ORIGIN_COL));
      const style: CSSProperties = {
        width: dotSize,
        height: dotSize,
        '--dmx-ring': ring,
        '--dmx-duration': `${duration}s`,
        '--dmx-delay': `${-(duration - (ring / MAX_MANHATTAN) * duration * 0.75)}s`,
        opacity: run ? undefined : 0.2 + (1 - ring / MAX_MANHATTAN) * 0.75,
      } as CSSProperties;
      dots.push(
        <span
          key={`${row}-${col}`}
          className={`rounded-full bg-white ${run ? 'dmx-ripple' : ''}`}
          style={style}
        />
      );
    }
  }

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID}, ${dotSize}px)`,
        gap,
        width: size,
        height: size,
        filter: bloom ? 'drop-shadow(0 0 3px rgba(255,255,255,0.55))' : undefined,
      }}
    >
      {dots}
    </div>
  );
}
