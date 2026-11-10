import { create } from 'zustand';

export interface LightingSettings {
  /** Overall light intensity multiplier (1 = default) */
  brightness: number;
  /** Sun compass direction in degrees (0 = from +Z / front of booth, 90 = from +X) */
  azimuth: number;
  /** Sun height above the horizon in degrees */
  elevation: number;
  /** -1 = cool blue, 0 = neutral white, 1 = warm orange */
  warmth: number;
  /** Shadow darkness, 0..1 */
  shadowStrength: number;
}

export type LightingPresetId = 'studio' | 'daylight' | 'sunset' | 'night';

export const LIGHTING_PRESETS: Record<
  LightingPresetId,
  { label: string; settings: LightingSettings }
> = {
  studio: {
    label: 'Studio',
    settings: { brightness: 1, azimuth: 39, elevation: 50, warmth: 0, shadowStrength: 0.6 },
  },
  daylight: {
    label: 'Daylight',
    settings: { brightness: 1.3, azimuth: 55, elevation: 65, warmth: 0.2, shadowStrength: 0.5 },
  },
  sunset: {
    label: 'Sunset',
    settings: { brightness: 1, azimuth: 250, elevation: 12, warmth: 0.9, shadowStrength: 0.85 },
  },
  night: {
    label: 'Night',
    settings: { brightness: 0.45, azimuth: 200, elevation: 40, warmth: -0.7, shadowStrength: 0.5 },
  },
};

interface LightingState extends LightingSettings {
  /** Active preset, or null once any slider has been changed by hand */
  preset: LightingPresetId | null;
  applyPreset: (id: LightingPresetId) => void;
  set: (patch: Partial<LightingSettings>) => void;
  reset: () => void;
}

export const useLightingStore = create<LightingState>((set) => ({
  ...LIGHTING_PRESETS.studio.settings,
  preset: 'studio',
  applyPreset: (id) => set({ ...LIGHTING_PRESETS[id].settings, preset: id }),
  set: (patch) => set({ ...patch, preset: null }),
  reset: () => set({ ...LIGHTING_PRESETS.studio.settings, preset: 'studio' }),
}));
