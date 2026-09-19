'use client';

import React from 'react';
import {
  Box,
  Rotate3d,
  Footprints,
  RotateCcw,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
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
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  modelData,
  selectedUnit,
  onUnitChange,
  onResetView,
  onOpenFile,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const hasModel = modelData !== null;
  const detectedUnit = modelData ? modelData.detectedUnit : 'm';
  const unitOptions: UnitType[] = ['auto', 'm', 'cm', 'mm', 'ft', 'in'];

  return (
    <header className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] select-none shrink-0 z-30">
      {/* Left: App Title & Model Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-[13px] tracking-tight">
          <Box className="w-4 h-4 text-[var(--accent)]" />
          <span>BoothViewer</span>
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
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>Orbit</span>
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
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Walk</span>
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[12px] font-medium transition cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Open File</span>
        </button>

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
