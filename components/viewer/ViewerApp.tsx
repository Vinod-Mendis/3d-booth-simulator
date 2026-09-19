'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
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

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
    handleResetView();
    addToast('success', 'Sample booth loaded successfully');
  };

  // Open file picker
  const handleOpenFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

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
      handleResetView();
      removeToast(toastId);
      addToast(
        'success',
        `Loaded "${newModel.name}" (${newModel.triangleCount.toLocaleString()} triangles)`
      );
    } catch (error: unknown) {
      removeToast(toastId);
      const msg = error instanceof Error ? error.message : 'Failed to load 3D model.';
      addToast('error', msg, 6000);
    }
  };

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <main
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative w-screen h-screen overflow-hidden select-none ${isDark ? 'dark' : ''}`}
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* 3D Scene Viewport */}
      <Scene
        modelData={modelData}
        mode={mode}
        theme={theme}
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
          isDark={isDark}
        />
      )}

      {/* Right-side Screens Management Panel */}
      {modelData && (
        <ScreensPanel
          modelData={modelData}
          mode={mode}
          isDark={isDark}
          onToast={(type, message) => addToast(type, message)}
          orbitTargetRef={orbitTargetRef}
          cameraRef={cameraRef}
        />
      )}

      {/* Bottom-left Info Panel */}
      <InfoPanel modelData={modelData} isDark={isDark} />

      {/* Bottom-center Hint Chips */}
      <HintChips mode={mode} isDark={isDark} hasModel={modelData !== null} />

      {/* Toast Notifications */}
      <Toaster toasts={toasts} onDismiss={removeToast} isDark={isDark} />

      {/* Walk Mode Crosshair Dot */}
      {mode === 'walk' && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/90 rounded-full pointer-events-none shadow-md ring-1 ring-black/50 z-30" />
      )}

      {/* Walk Mode "Press E to play/pause" Floating Prompt */}
      {mode === 'walk' && focusedVideoScreenId && !interactiveScreenId && (
        <div className="fixed top-[calc(50%+20px)] left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xl pointer-events-none flex items-center gap-2 z-40 animate-fade-in">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono font-bold text-amber-400">
            E
          </kbd>
          <span>
            Press E to {videoRuntime[focusedVideoScreenId]?.isPlaying ? 'pause' : 'play'}
          </span>
        </div>
      )}

      {/* Walk Mode "Press E to use this screen" Floating Prompt */}
      {mode === 'walk' && focusedWebScreenId && !interactiveScreenId && (
        <div className="fixed top-[calc(50%+20px)] left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xl pointer-events-none flex items-center gap-2 z-40 animate-fade-in">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono font-bold text-sky-400">
            E
          </kbd>
          <span>Press E to use this screen</span>
        </div>
      )}

      {/* Interactive Web Screen Floating Header / Exit Button */}
      {interactiveScreenId && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-950/90 backdrop-blur-xl border border-sky-500/50 shadow-2xl px-4 py-2 rounded-2xl animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">
              Interacting with screen
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInteractiveScreenId(null)}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Exit screen</span>
            <span className="text-[10px] text-sky-200 opacity-75">(or click canvas)</span>
          </button>
        </div>
      )}

      {/* Drag & Drop "Release to open" Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-sky-950/70 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-sky-400 pointer-events-none animate-fadeIn">
          <div className="w-20 h-20 rounded-3xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 mb-4 animate-bounce">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Release to open</h2>
          <p className="text-sm text-sky-200 mt-1 font-medium">
            Drop your .glb or .gltf with .bin &amp; textures here
          </p>
        </div>
      )}
    </main>
  );
};
