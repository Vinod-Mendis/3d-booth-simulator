'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Box } from 'lucide-react';
import { LoadedModelData, ViewerMode, UnitType, ToastMessage } from '@/lib/types';
import { loadSampleBoothData, loadModelFiles, disposeHierarchy } from '@/lib/loadModel';
import { getUnitScale } from '@/lib/units';
import { useScreensStore } from '@/lib/screensStore';
import { Scene } from './Scene';
import { TopBar } from './UI/TopBar';
import { EmptyState } from './UI/EmptyState';
import { InfoPanel } from './UI/InfoPanel';
import { HintChips } from './UI/HintChips';
import { Toaster } from './UI/Toaster';
import { ScreensPanel } from './screens/ScreensPanel';

export const ViewerApp: React.FC = () => {
  const [modelData, setModelData] = useState<LoadedModelData | null>(null);
  const [mode, setMode] = useState<ViewerMode>('orbit');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('auto');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);

  const focusedVideoScreenId = useScreensStore((s) => s.focusedVideoScreenId);
  const videoRuntime = useScreensStore((s) => s.videoRuntime);
  const focusedWebScreenId = useScreensStore((s) => s.focusedWebScreenId);
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);
  const setInteractiveScreenId = useScreensStore((s) => s.setInteractiveScreenId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const activeModelRef = useRef<LoadedModelData | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const orbitTargetRef = useRef<THREE.Vector3 | null>(null);

  // Sync screens store when model loads
  useEffect(() => {
    useScreensStore.getState().syncModel(modelData);
  }, [modelData]);

  // Keep activeModelRef in sync for cleanup
  useEffect(() => {
    activeModelRef.current = modelData;
  }, [modelData]);

  // Clean up WebGL resources when component unmounts
  useEffect(() => {
    return () => {
      if (activeModelRef.current) {
        disposeHierarchy(activeModelRef.current.object);
      }
    };
  }, []);

  // Auto-collapse sidebar below 1100px width
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], message: string, duration = 4000) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Unit changes recompute scaled dimensions and bounds
  const handleUnitChange = (unit: UnitType) => {
    setSelectedUnit(unit);
    if (!modelData) return;

    const scaleFactor = getUnitScale(unit, modelData.detectedUnit);
    const scaledSize = modelData.nativeSize.clone().multiplyScalar(scaleFactor);
    const scaledBoundingBox = modelData.nativeBoundingBox.clone();
    scaledBoundingBox.min.multiplyScalar(scaleFactor);
    scaledBoundingBox.max.multiplyScalar(scaleFactor);

    setModelData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        selectedUnit: unit,
        scaleFactor,
        scaledSize,
        scaledBoundingBox,
      };
    });
  };

  // Reset view button handler
  const handleResetView = () => {
    setResetViewTrigger((c) => c + 1);
  };

  // Load sample booth
  const handleTrySample = () => {
    if (activeModelRef.current) {
      disposeHierarchy(activeModelRef.current.object);
    }
    const sample = loadSampleBoothData();
    setModelData(sample);
    setSelectedUnit('m');
    setMode('orbit');
    setIsSidebarOpen(true);
    handleResetView();
    addToast('success', 'Sample booth loaded');
  };

  // Open file picker
  const handleOpenFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Global Keyboard Shortcuts (Ctrl+O, 1 for Orbit, 2 for Walk, R for Reset View in Orbit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input, textarea, select or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ctrl+O or Cmd+O
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleOpenFile();
        return;
      }

      // 1: Orbit mode
      if (e.key === '1' && modelData) {
        setMode('orbit');
        return;
      }

      // 2: Walk mode
      if (e.key === '2' && modelData) {
        setMode('walk');
        return;
      }

      // R: Reset View (Orbit mode only)
      if (
        (e.key === 'r' || e.key === 'R') &&
        !e.ctrlKey &&
        !e.metaKey &&
        modelData &&
        mode === 'orbit'
      ) {
        handleResetView();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modelData, mode]);

  // Drag and drop events on root container
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  // Handler for loaded files
  const handleFiles = async (files: File[]) => {
    const toastId = addToast('loading', 'Loading 3D model...', 0);
    try {
      const newModel = await loadModelFiles(files);
      if (activeModelRef.current) {
        disposeHierarchy(activeModelRef.current.object);
      }
      setModelData(newModel);
      setSelectedUnit('auto');
      setMode('orbit');
      setIsSidebarOpen(true);
      handleResetView();
      removeToast(toastId);
      addToast('success', `Loaded "${newModel.name}"`);
    } catch (error: unknown) {
      removeToast(toastId);
      const msg = error instanceof Error ? error.message : 'Failed to load 3D model.';
      addToast('error', msg, 6000);
    }
  };

  return (
    <main
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col w-screen h-screen overflow-hidden select-none bg-[var(--bg-app)] text-[var(--text-primary)] font-sans"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb,.gltf,.bin,image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Bar Header */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        modelData={modelData}
        selectedUnit={selectedUnit}
        onUnitChange={handleUnitChange}
        onResetView={handleResetView}
        onOpenFile={handleOpenFile}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace: Flex row containing Canvas & Docked Sidebar */}
      <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden">
        {/* 3D Scene Viewport Container: Fills remaining space, overflow-hidden keeps Drei Html inside */}
        <div className="flex-1 min-w-0 relative h-full overflow-hidden bg-[var(--bg-canvas)]">
          <Scene
            modelData={modelData}
            mode={mode}
            theme="dark"
            resetViewTrigger={resetViewTrigger}
            onCameraReady={(cam) => {
              cameraRef.current = cam;
            }}
            orbitTargetRef={orbitTargetRef}
          />

          {/* Empty State Card */}
          {!modelData && (
            <EmptyState
              onOpenFile={handleOpenFile}
              onTrySample={handleTrySample}
            />
          )}

          {/* Bottom-left Info Panel */}
          <InfoPanel modelData={modelData} />

          {/* Bottom-center Hint Chips */}
          <HintChips mode={mode} hasModel={modelData !== null} />

          {/* Toast Notifications (positioned inside canvas container) */}
          <Toaster toasts={toasts} onDismiss={removeToast} />

          {/* Walk Mode Crosshair Dot (centered on visible canvas) */}
          {mode === 'walk' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full pointer-events-none ring-1 ring-black/80 z-30" />
          )}

          {/* Walk Mode "Press E to play/pause" Floating Prompt */}
          {mode === 'walk' && focusedVideoScreenId && !interactiveScreenId && (
            <div className="absolute top-[calc(50%+24px)] left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium shadow-md pointer-events-none flex items-center gap-1.5 z-40">
              <kbd className="px-1 py-0.2 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[10px] font-mono font-bold text-[var(--accent-text)]">
                E
              </kbd>
              <span>
                Press E to {videoRuntime[focusedVideoScreenId]?.isPlaying ? 'pause' : 'play'}
              </span>
            </div>
          )}

          {/* Walk Mode "Press E to use this screen" Floating Prompt */}
          {mode === 'walk' && focusedWebScreenId && !interactiveScreenId && (
            <div className="absolute top-[calc(50%+24px)] left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium shadow-md pointer-events-none flex items-center gap-1.5 z-40">
              <kbd className="px-1 py-0.2 bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[10px] font-mono font-bold text-[var(--accent-text)]">
                E
              </kbd>
              <span>Press E to use screen</span>
            </div>
          )}

          {/* Interactive Web Screen Floating Header / Exit Button */}
          {interactiveScreenId && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-1.5 rounded-[var(--radius-sm)] shadow-md select-none">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                Interacting with screen
              </span>
              <button
                type="button"
                onClick={() => setInteractiveScreenId(null)}
                className="h-6 px-2 rounded-[var(--radius-sm)] font-medium text-[11px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition cursor-pointer flex items-center gap-1"
              >
                <span>Exit screen</span>
                <span className="text-[10px] opacity-75">(or click canvas)</span>
              </button>
            </div>
          )}

          {/* Drag & Drop "Release to open" Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-[var(--bg-app)]/90 flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--accent)] pointer-events-none">
              <Box className="w-10 h-10 text-[var(--accent)] mb-3" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Release to open</h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Drop .glb or .gltf with .bin &amp; textures
              </p>
            </div>
          )}
        </div>

        {/* Docked Right Sidebar: Screens Management & Inspector */}
        {modelData && (
          <ScreensPanel
            modelData={modelData}
            mode={mode}
            onToast={(type, message) => addToast(type, message)}
            orbitTargetRef={orbitTargetRef}
            cameraRef={cameraRef}
            isCollapsed={!isSidebarOpen}
            onToggleCollapse={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </main>
  );
};
