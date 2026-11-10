'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  LIGHTING_PRESETS,
  LightingPresetId,
  LightingSettings,
  useLightingStore,
} from '@/lib/lightingStore';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, display, onChange }) => (
  <label className="block">
    <div className="flex items-center justify-between text-[11px] mb-0.5">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-[var(--text-muted)]">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 accent-white cursor-pointer"
    />
  </label>
);

export const LightingPanel: React.FC = () => {
  const settings = useLightingStore();
  const { preset, applyPreset, set, reset } = settings;

  const update = (patch: Partial<LightingSettings>) => set(patch);

  return (
    <div className="font-sans text-[12px]">
      <>
        <div className="text-[var(--text-primary)]">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
            <span className="text-[11px] font-medium">Lighting</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={reset}
                aria-label="Reset lighting"
                title="Reset lighting"
                className="p-0.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(LIGHTING_PRESETS) as LightingPresetId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={preset === id}
                  onClick={() => applyPreset(id)}
                  className={`px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border transition cursor-pointer ${
                    preset === id
                      ? 'bg-[var(--accent)] text-black border-transparent'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  {LIGHTING_PRESETS[id].label}
                </button>
              ))}
            </div>

            <SliderRow
              label="Brightness"
              value={settings.brightness}
              min={0.2}
              max={2}
              step={0.05}
              display={`${Math.round(settings.brightness * 100)}%`}
              onChange={(v) => update({ brightness: v })}
            />
            <SliderRow
              label="Sun direction"
              value={settings.azimuth}
              min={0}
              max={360}
              step={1}
              display={`${Math.round(settings.azimuth)}°`}
              onChange={(v) => update({ azimuth: v })}
            />
            <SliderRow
              label="Sun height"
              value={settings.elevation}
              min={5}
              max={90}
              step={1}
              display={`${Math.round(settings.elevation)}°`}
              onChange={(v) => update({ elevation: v })}
            />
            <SliderRow
              label="Warmth"
              value={settings.warmth}
              min={-1}
              max={1}
              step={0.05}
              display={
                settings.warmth > 0.05 ? 'Warm' : settings.warmth < -0.05 ? 'Cool' : 'Neutral'
              }
              onChange={(v) => update({ warmth: v })}
            />
            <SliderRow
              label="Shadows"
              value={settings.shadowStrength}
              min={0}
              max={1}
              step={0.05}
              display={`${Math.round(settings.shadowStrength * 100)}%`}
              onChange={(v) => update({ shadowStrength: v })}
            />
          </div>
        </div>
      </>
    </div>
  );
};
