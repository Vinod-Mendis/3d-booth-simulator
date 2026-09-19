'use client';

import React from 'react';
import { ViewerMode, UnitType, LoadedModelData } from '@/lib/types';
import { getUnitDisplayLabel } from '@/lib/units';

interface TopBarProps {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  modelData: LoadedModelData | null;
  selectedUnit: UnitType;
  onUnitChange: (unit: UnitType) => void;
  onResetView: () => void;
  onOpenFile: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  modelData,
  selectedUnit,
  onUnitChange,
  onResetView,
  onOpenFile,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const hasModel = modelData !== null;
  const detectedUnit = modelData ? modelData.detectedUnit : 'm';

  const unitOptions: UnitType[] = ['auto', 'm', 'cm', 'mm', 'ft', 'in'];

  return (
    <header
      className={`absolute top-0 inset-x-0 z-20 h-16 px-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-200 select-none ${
        isDark
          ? 'bg-slate-950/75 border-slate-800 text-slate-100'
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m9-5.25L12 12m0 9V12" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight leading-tight">BoothWalk 3D</h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">Event Stage &amp; Booth Viewer</p>
        </div>
      </div>

      {/* Center: Mode Segmented Control */}
      <div
        role="group"
        aria-label="Viewer Mode"
        className={`flex items-center p-1 rounded-xl border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-slate-100/90 border-slate-300'
        }`}
      >
        <button
          type="button"
          aria-pressed={mode === 'orbit'}
          disabled={!hasModel}
          onClick={(e) => {
            onModeChange('orbit');
            e.currentTarget.blur();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            mode === 'orbit'
              ? 'bg-sky-600 text-white shadow-sm'
              : isDark
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Orbit</span>
        </button>

        <button
          type="button"
          aria-pressed={mode === 'walk'}
          disabled={!hasModel}
          onClick={(e) => {
            onModeChange('walk');
            e.currentTarget.blur();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            mode === 'walk'
              ? 'bg-sky-600 text-white shadow-sm'
              : isDark
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Walk</span>
        </button>
      </div>

      {/* Right: Units, Reset View, Open File, Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Model Units Select */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="model-units-select" className="sr-only">Model units</label>
          <select
            id="model-units-select"
            disabled={!hasModel}
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value as UnitType)}
            className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
            }`}
          >
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit === 'auto'
                  ? getUnitDisplayLabel('auto', detectedUnit)
                  : getUnitDisplayLabel(unit, detectedUnit)}
              </option>
            ))}
          </select>
        </div>

        {/* Reset View / Back to entrance Button */}
        <button
          type="button"
          disabled={!hasModel}
          onClick={(e) => {
            onResetView();
            e.currentTarget.blur();
          }}
          title={mode === 'walk' ? 'Back to entrance' : 'Reset camera view'}
          className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            mode === 'walk'
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
              : isDark
              ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300'
              : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
          }`}
        >
          {mode === 'walk' ? (
            <>
              <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Back to entrance</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden md:inline">Reset view</span>
            </>
          )}
        </button>

        {/* Open File Button */}
        <button
          type="button"
          onClick={onOpenFile}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Open file</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          className={`p-1.5 rounded-lg border text-xs transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};
