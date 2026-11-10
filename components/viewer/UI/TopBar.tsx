'use client';

import React from 'react';
import {
  Rotate3d,
  Footprints,
  RotateCcw,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize,
  Minimize,
  Camera,
} from 'lucide-react';
import { ViewerMode, UnitType, LoadedModelData } from '@/lib/types';
import { getUnitDisplayLabel } from '@/lib/units';
import { useFullscreen } from './useFullscreen';

interface TopBarProps {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  modelData: LoadedModelData | null;
  selectedUnit: UnitType;
  onUnitChange: (unit: UnitType) => void;
  onResetView: () => void;
  onOpenFile: () => void;
  onScreenshot: () => void;
  screenshotLogo: boolean;
  onToggleScreenshotLogo: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isTouch?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  modelData,
  selectedUnit,
  onUnitChange,
  onResetView,
  onOpenFile,
  onScreenshot,
  screenshotLogo,
  onToggleScreenshotLogo,
  isSidebarOpen,
  onToggleSidebar,
  isTouch = false,
}) => {
  const { isSupported: canFullscreen, isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const hasModel = modelData !== null;
  const detectedUnit = modelData ? modelData.detectedUnit : 'm';
  const unitOptions: UnitType[] = ['auto', 'm', 'cm', 'mm', 'ft', 'in'];

  return (
    <header className="h-10 px-2 sm:px-3 gap-1 flex items-center justify-between overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] select-none shrink-0 z-30">
      {/* Left: App Title & Model Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-[13px] tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.svg" alt="Pre-Show logo" className="h-3.5 w-auto" />
          <span className="hidden sm:inline">Pre-Show</span>
        </div>
        {hasModel && (
          <>
            <span className="h-3.5 w-px bg-[var(--border-default)]" />
            <span
              className="text-[11px] text-[var(--text-muted)] font-mono truncate max-w-[140px] sm:max-w-[200px]"
              title={modelData.name}
            >
              {modelData.name}
            </span>
          </>
        )}
      </div>

      {/* Center: Mode Segmented Control & View Operations */}
      <div className="flex items-center gap-1">
        {/* Mode Segmented Control */}
        <div
          role="group"
          aria-label="Viewer Mode"
          className="flex items-center p-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]"
        >
          <button
            type="button"
            aria-label="Orbit Mode [1]"
            aria-pressed={mode === 'orbit'}
            disabled={!hasModel}
            onClick={(e) => {
              onModeChange('orbit');
              e.currentTarget.blur();
            }}
            title="Orbit Mode [1]"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              mode === 'orbit'
                ? 'bg-[var(--accent)] text-black'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Orbit</span>
          </button>

          <button
            type="button"
            aria-label="Walk Mode [2]"
            aria-pressed={mode === 'walk'}
            disabled={!hasModel}
            onClick={(e) => {
              onModeChange('walk');
              e.currentTarget.blur();
            }}
            title="Walk Mode [2]"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              mode === 'walk'
                ? 'bg-[var(--accent)] text-black'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walk</span>
          </button>
        </div>

        <span className="h-4 w-px bg-[var(--border-default)] mx-1" />

        {/* Reset View Button */}
        <button
          type="button"
          aria-label={mode === 'orbit' ? 'Reset view [R]' : 'Back to entrance'}
          disabled={!hasModel}
          onClick={(e) => {
            onResetView();
            e.currentTarget.blur();
          }}
          title={mode === 'orbit' ? 'Reset view [R]' : 'Back to entrance'}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {mode === 'orbit' ? 'Reset View' : 'Entrance'}
          </span>
        </button>

        {/* Screenshot: PNG of the current view, optionally stamped with the logo */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Save screenshot [P]"
            disabled={!hasModel}
            onClick={(e) => {
              onScreenshot();
              e.currentTarget.blur();
            }}
            title="Save screenshot [P]"
            className="flex items-center gap-1.5 px-2 py-1 rounded-l-[var(--radius-sm)] text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Screenshot</span>
          </button>
          <button
            type="button"
            aria-pressed={screenshotLogo}
            aria-label="Include logo in screenshot"
            disabled={!hasModel}
            onClick={(e) => {
              onToggleScreenshotLogo();
              e.currentTarget.blur();
            }}
            title="Include Pre-Show logo in screenshot"
            className={`px-1.5 py-1 -ml-px rounded-r-[var(--radius-sm)] text-[11px] font-medium border border-[var(--border-default)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer ${
              screenshotLogo
                ? 'bg-[var(--accent)] text-black'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            Logo
          </button>
        </div>

        {/* Model Units Selector */}
        <div className="flex items-center gap-1">
          <label htmlFor="model-units-select" className="sr-only">Model units</label>
          <select
            id="model-units-select"
            disabled={!hasModel}
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value as UnitType)}
            title="Model scale unit"
            className="h-7 px-2 text-[11px] font-mono rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
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
      </div>

      {/* Right: Open File & Sidebar Toggle */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenFile}
          aria-label="Open model [Ctrl+O]"
          title="Open model [Ctrl+O]"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black text-[12px] font-medium transition cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open File</span>
        </button>

        {isTouch && canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        )}

        {hasModel && (
          <>
            <span className="h-4 w-px bg-[var(--border-default)] mx-0.5" />
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? 'Collapse inspector sidebar' : 'Expand inspector sidebar'}
              title={isSidebarOpen ? 'Collapse inspector sidebar' : 'Expand inspector sidebar'}
              className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              {isSidebarOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
