'use client';

import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import {
  ScreenData,
  ScreenAspect,
  LoadedModelData,
  ViewerMode,
  VideoFit,
} from '@/lib/types';
import {
  useScreensStore,
  ASPECT_RATIOS,
} from '@/lib/screensStore';
import { placeScreenFromView } from '@/lib/placeOnSurface';
import { extractCollidableMeshes } from '@/lib/collision';
import { saveVideo, validateVideoUrl } from '@/lib/videoStore';

interface ScreensPanelProps {
  modelData: LoadedModelData | null;
  mode: ViewerMode;
  isDark: boolean;
  onToast: (type: 'info' | 'success' | 'error', message: string) => void;
  orbitTargetRef?: React.RefObject<THREE.Vector3 | null>;
  cameraRef?: React.RefObject<THREE.Camera | null>;
}

export const ScreensPanel: React.FC<ScreensPanelProps> = ({
  modelData,
  mode,
  isDark,
  onToast,
  orbitTargetRef,
  cameraRef,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const screens = useScreensStore((s) => s.screens);
  const selectedScreenId = useScreensStore((s) => s.selectedScreenId);
  const isEditing = useScreensStore((s) => s.isEditing);
  const gizmoMode = useScreensStore((s) => s.gizmoMode);
  const isPlacingOnSurface = useScreensStore((s) => s.isPlacingOnSurface);
  const adoptedMeshNames = useScreensStore((s) => s.adoptedMeshNames);
  const videoRuntime = useScreensStore((s) => s.videoRuntime);

  const addScreen = useScreensStore((s) => s.addScreen);
  const updateScreen = useScreensStore((s) => s.updateScreen);
  const deleteScreen = useScreensStore((s) => s.deleteScreen);
  const duplicateScreen = useScreensStore((s) => s.duplicateScreen);
  const selectScreen = useScreensStore((s) => s.selectScreen);
  const setEditing = useScreensStore((s) => s.setEditing);
  const setGizmoMode = useScreensStore((s) => s.setGizmoMode);
  const setPlacingOnSurface = useScreensStore((s) => s.setPlacingOnSurface);
  const flipFacing = useScreensStore((s) => s.flipFacing);
  const adoptTaggedScreen = useScreensStore((s) => s.adoptTaggedScreen);
  const exportLayout = useScreensStore((s) => s.exportLayout);
  const importLayout = useScreensStore((s) => s.importLayout);
  const togglePlayPause = useScreensStore((s) => s.togglePlayPause);
  const setVideoRuntime = useScreensStore((s) => s.setVideoRuntime);

  if (!modelData) return null;

  const selectedScreen = screens.find((s) => s.id === selectedScreenId) || null;

  // Unadopted tagged meshes from model
  const unadoptedTaggedScreens = modelData.screens.filter(
    (s) => !adoptedMeshNames.includes(s.name)
  );

  // Handle "Add Screen"
  const handleAddScreen = () => {
    if (!cameraRef?.current) {
      onToast('error', 'Camera not ready to calculate screen placement.');
      return;
    }

    const modelMeshes = extractCollidableMeshes(modelData.object);
    const orbitTarget = orbitTargetRef?.current || new THREE.Vector3(0, 1.5, 0);

    const { nativePosition, quaternion } = placeScreenFromView(
      cameraRef.current,
      modelMeshes,
      modelData,
      mode,
      orbitTarget
    );

    const newIndex = screens.length + 1;
    const newScreen: ScreenData = {
      id: `screen_${Date.now()}`,
      name: `Screen ${newIndex}`,
      width: 3.2,
      height: 1.8,
      aspect: '16:9',
      isAspectLocked: true,
      position: nativePosition,
      quaternion,
      pixelWidth: 1920,
      pixelHeight: 1080,
      content: { type: 'none' },
    };

    addScreen(newScreen);
    onToast('success', `Created "${newScreen.name}" (3.20 × 1.80 m)`);
  };

  // Dimension & Aspect changes
  const handleWidthChange = (valStr: string) => {
    if (!selectedScreen) return;
    const val = parseFloat(valStr);
    if (!Number.isFinite(val) || val <= 0) return;

    if (selectedScreen.isAspectLocked) {
      const ratio = selectedScreen.width / selectedScreen.height;
      const newHeight = Number((val / ratio).toFixed(2));
      const newPixelHeight = Math.round(selectedScreen.pixelWidth / ratio);
      updateScreen(selectedScreen.id, {
        width: val,
        height: newHeight,
        pixelHeight: newPixelHeight,
      }, true);
    } else {
      updateScreen(selectedScreen.id, { width: val }, true);
    }
  };

  const handleHeightChange = (valStr: string) => {
    if (!selectedScreen) return;
    const val = parseFloat(valStr);
    if (!Number.isFinite(val) || val <= 0) return;

    if (selectedScreen.isAspectLocked) {
      const ratio = selectedScreen.width / selectedScreen.height;
      const newWidth = Number((val * ratio).toFixed(2));
      updateScreen(selectedScreen.id, {
        width: newWidth,
        height: val,
      }, true);
    } else {
      updateScreen(selectedScreen.id, { height: val }, true);
    }
  };

  const handleAspectPresetChange = (aspect: ScreenAspect) => {
    if (!selectedScreen) return;

    if (aspect === 'custom') {
      updateScreen(selectedScreen.id, { aspect: 'custom' }, true);
      return;
    }

    const ratio = ASPECT_RATIOS[aspect];
    const newHeight = Number((selectedScreen.width / ratio).toFixed(2));
    const newPixelHeight = Math.round(selectedScreen.pixelWidth / ratio);

    updateScreen(selectedScreen.id, {
      aspect,
      height: newHeight,
      pixelHeight: newPixelHeight,
    }, true);
  };

  // Convert quaternion to Euler degrees for display
  const eulerDeg = selectedScreen
    ? (() => {
        const q = new THREE.Quaternion(...selectedScreen.quaternion);
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        return {
          x: Math.round(THREE.MathUtils.radToDeg(e.x)),
          y: Math.round(THREE.MathUtils.radToDeg(e.y)),
          z: Math.round(THREE.MathUtils.radToDeg(e.z)),
        };
      })()
    : { x: 0, y: 0, z: 0 };

  // Calculate diagonal in inches
  const diagonalInches = selectedScreen
    ? (Math.hypot(selectedScreen.width, selectedScreen.height) / 0.0254).toFixed(1)
    : '0';

  const activeVideoRuntime = selectedScreen ? videoRuntime[selectedScreen.id] : undefined;

  // Video Handlers
  const handleContentTypeChange = (type: 'none' | 'video') => {
    if (!selectedScreen) return;
    if (type === 'none') {
      updateScreen(selectedScreen.id, { content: { type: 'none' } }, true);
    } else if (type === 'video') {
      if (selectedScreen.content.type !== 'video') {
        updateScreen(
          selectedScreen.id,
          {
            content: {
              type: 'video',
              source: 'file',
              videoId: '',
              fileName: '',
              fit: 'contain',
              muted: true,
              loop: true,
            },
          },
          true
        );
      }
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedScreen) return;

    if (file.size > 200 * 1024 * 1024) {
      onToast('info', 'Warning: Video file is over 200 MB. Large files may impact performance or memory.');
    }

    setIsUploadingVideo(true);
    try {
      const videoId = await saveVideo(file);
      updateScreen(
        selectedScreen.id,
        {
          content: {
            type: 'video',
            source: 'file',
            videoId,
            fileName: file.name,
            fit: 'contain',
            muted: true,
            loop: true,
          },
        },
        true
      );
      setVideoRuntime(selectedScreen.id, { isPlaying: true, isReady: false, error: null });
      onToast('success', `Loaded video "${file.name}"`);
    } catch (err) {
      onToast('error', 'Failed to store video: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploadingVideo(false);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  const handleApplyVideoUrl = () => {
    if (!selectedScreen) return;
    const validation = validateVideoUrl(videoUrlInput);
    if (!validation.valid) {
      onToast('error', validation.error || 'Invalid video URL');
      return;
    }

    updateScreen(
      selectedScreen.id,
      {
        content: {
          type: 'video',
          source: 'url',
          src: videoUrlInput.trim(),
          fit: 'contain',
          muted: true,
          loop: true,
        },
      },
      true
    );
    setVideoRuntime(selectedScreen.id, { isPlaying: true, isReady: false, error: null });
    onToast('success', 'Applied video URL');
    setVideoUrlInput('');
  };

  const handleFitChange = (fit: VideoFit) => {
    if (!selectedScreen || selectedScreen.content.type !== 'video') return;
    updateScreen(
      selectedScreen.id,
      {
        content: { ...selectedScreen.content, fit },
      },
      true
    );
  };

  const handleToggleLoop = () => {
    if (!selectedScreen || selectedScreen.content.type !== 'video') return;
    updateScreen(
      selectedScreen.id,
      {
        content: { ...selectedScreen.content, loop: !selectedScreen.content.loop },
      },
      true
    );
  };

  const handleToggleSound = () => {
    if (!selectedScreen || selectedScreen.content.type !== 'video') return;
    const newMuted = !selectedScreen.content.muted;
    updateScreen(
      selectedScreen.id,
      {
        content: { ...selectedScreen.content, muted: newMuted },
      },
      true
    );
    if (!newMuted) {
      onToast('info', 'Audio unmuted');
    }
  };

  const handleRemoveVideo = () => {
    if (!selectedScreen) return;
    updateScreen(
      selectedScreen.id,
      {
        content: { type: 'none' },
      },
      true
    );
    onToast('info', 'Video removed');
  };

  // Export JSON
  const handleExport = () => {
    try {
      const json = exportLayout();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screens_layout_${modelData.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('success', 'Layout exported to JSON');
    } catch {
      onToast('error', 'Failed to export layout');
    }
  };

  // Import JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = importLayout(text, modelData);
      if (res.success) {
        onToast('success', 'Layout imported successfully');
      } else {
        onToast('error', res.error || 'Failed to import layout: validation failed.');
      }
    };
    reader.onerror = () => {
      onToast('error', 'Failed to read JSON file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="absolute top-20 right-4 z-20 max-w-sm w-full select-none pointer-events-auto">
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      <div
        className={`rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-200 overflow-hidden flex flex-col ${
          isDark
            ? 'bg-slate-950/85 border-slate-800 text-slate-100 shadow-black/60'
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-300/60'
        } ${isCollapsed ? 'max-h-14' : 'max-h-[85vh]'}`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-wider">Display Screens</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-bold">
              {screens.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Editing / Presentation Mode Toggle */}
            <button
              type="button"
              onClick={() => setEditing(!isEditing)}
              title={isEditing ? 'Presentation mode (Hide gizmos & outlines)' : 'Editing mode (Show gizmos & outlines)'}
              className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                isEditing
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {isEditing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View</span>
                </>
              )}
            </button>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <svg
                className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Panel Content */}
        {!isCollapsed && (
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-3.5rem)] text-xs">
            {/* Top Action Buttons: Add Screen & Place on surface */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddScreen}
                className="flex-1 py-2 px-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add screen</span>
              </button>

              {selectedScreen && (
                <button
                  type="button"
                  onClick={() => setPlacingOnSurface(!isPlacingOnSurface)}
                  title="Click any spot on the model to snap the selected screen there"
                  className={`py-2 px-3 rounded-xl font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                    isPlacingOnSurface
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 ring-2 ring-amber-500/30 animate-pulse'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{isPlacingOnSurface ? 'Click surface...' : 'Place'}</span>
                </button>
              )}
            </div>

            {/* Screens List */}
            {screens.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Configured Screens ({screens.length})
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {screens.map((screen) => {
                    const isSelected = screen.id === selectedScreenId;
                    return (
                      <div
                        key={screen.id}
                        onClick={() => selectScreen(screen.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 font-medium'
                            : isDark
                            ? 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-800/50 text-slate-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-sky-400' : 'bg-slate-600'}`} />
                          {editingNameId === screen.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onBlur={() => {
                                if (tempName.trim()) {
                                  updateScreen(screen.id, { name: tempName.trim() }, true);
                                }
                                setEditingNameId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (tempName.trim()) {
                                    updateScreen(screen.id, { name: tempName.trim() }, true);
                                  }
                                  setEditingNameId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingNameId(null);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded text-xs bg-slate-950 border border-sky-500 text-white w-full outline-none"
                            />
                          ) : (
                            <span
                              className="truncate font-semibold cursor-text"
                              onDoubleClick={() => {
                                setEditingNameId(screen.id);
                                setTempName(screen.name);
                              }}
                              title="Double-click to rename"
                            >
                              {screen.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {screen.width}×{screen.height}m
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => duplicateScreen(screen.id)}
                            title="Duplicate screen"
                            className="p-1 rounded hover:text-sky-400 text-slate-400 transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteScreen(screen.id)}
                            title="Delete screen"
                            className="p-1 rounded hover:text-rose-400 text-slate-400 transition cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`p-3 rounded-xl border text-center ${
                  isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                No screens configured yet. Click <strong>Add screen</strong> or adopt one from the model below.
              </div>
            )}

            {/* Selected Screen Inspector Details */}
            {selectedScreen && (
              <div className="pt-3 border-t border-inherit space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sky-400 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>Screen Inspector</span>
                  </div>

                  {/* Gizmo Controls: Move / Rotate / Flip */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGizmoMode('translate')}
                      title="Move (G/W)"
                      className={`p-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                        gizmoMode === 'translate'
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={() => setGizmoMode('rotate')}
                      title="Rotate (R)"
                      className={`p-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                        gizmoMode === 'rotate'
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Rotate
                    </button>
                    <button
                      type="button"
                      onClick={() => flipFacing(selectedScreen.id)}
                      title="Flip facing (Rotate 180°)"
                      className="p-1 rounded-md text-[11px] font-medium border bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                    >
                      Flip 180°
                    </button>
                  </div>
                </div>

                {/* Dimensions (Width / Height) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Dimensions (Meters):</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateScreen(selectedScreen.id, { isAspectLocked: !selectedScreen.isAspectLocked }, true)
                      }
                      title={selectedScreen.isAspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                      className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                        selectedScreen.isAspectLocked
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {selectedScreen.isAspectLocked ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        )}
                      </svg>
                      <span>{selectedScreen.isAspectLocked ? 'Locked' : 'Unlocked'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">WIDTH (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={selectedScreen.width}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">HEIGHT (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={selectedScreen.height}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Presets & Diagonal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400">Aspect Preset:</label>
                    <select
                      value={selectedScreen.aspect}
                      onChange={(e) => handleAspectPresetChange(e.target.value as ScreenAspect)}
                      className={`text-xs rounded-md px-2 py-1 border font-medium cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'
                      }`}
                    >
                      <option value="16:9">16:9 (Standard)</option>
                      <option value="21:9">21:9 (Ultrawide)</option>
                      <option value="4:3">4:3 (Classic)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
                    <span>Diagonal size:</span>
                    <strong className="font-mono">{diagonalInches}&quot; ({(Math.hypot(selectedScreen.width, selectedScreen.height)).toFixed(2)} m)</strong>
                  </div>
                </div>

                {/* Position & Rotation Info */}
                <div className="pt-2 border-t border-inherit space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Native Pos (X, Y, Z):</span>
                    <span className="font-mono text-slate-200">
                      {selectedScreen.position[0].toFixed(2)}, {selectedScreen.position[1].toFixed(2)}, {selectedScreen.position[2].toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rotation (Yaw, Pitch, Roll):</span>
                    <span className="font-mono text-slate-200">
                      {eulerDeg.y}°, {eulerDeg.x}°, {eulerDeg.z}°
                    </span>
                  </div>
                </div>

                {/* Screen Content Section */}
                <div className="pt-3 border-t border-inherit space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sky-400 text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <span>Screen Content</span>
                    </div>
                  </div>

                  {/* Content Type Selector */}
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => handleContentTypeChange('none')}
                      className={`py-1.5 rounded-lg border transition cursor-pointer ${
                        selectedScreen.content.type === 'none'
                          ? 'bg-sky-600 text-white border-sky-500 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContentTypeChange('video')}
                      className={`py-1.5 rounded-lg border transition cursor-pointer ${
                        selectedScreen.content.type === 'video'
                          ? 'bg-sky-600 text-white border-sky-500 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      type="button"
                      disabled
                      className="py-1 rounded-lg border bg-slate-900/50 text-slate-500 border-slate-800/80 cursor-not-allowed flex flex-col items-center justify-center opacity-70"
                      title="Live interactive web pages coming in Phase 2C"
                    >
                      <span>Web page</span>
                      <span className="text-[9px] text-amber-500/80 font-mono">Coming next</span>
                    </button>
                  </div>

                  {/* Video Configuration & Controls */}
                  {selectedScreen.content.type === 'video' && (
                    <div className="space-y-3 pt-1">
                      {/* Hidden File Input */}
                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept=".mp4,.webm,video/mp4,video/webm"
                        className="hidden"
                        onChange={handleVideoFileUpload}
                      />

                      {/* If No Video Attached: Show Upload & URL Inputs */}
                      {(selectedScreen.content.source === 'file' && !selectedScreen.content.videoId) ||
                      (selectedScreen.content.source === 'url' && !selectedScreen.content.src) ? (
                        <div className="space-y-2">
                          {/* Upload Button */}
                          <button
                            type="button"
                            disabled={isUploadingVideo}
                            onClick={() => videoFileInputRef.current?.click()}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-sky-500/50 hover:border-sky-400 bg-sky-500/10 hover:bg-sky-500/15 text-sky-300 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>{isUploadingVideo ? 'Storing video...' : 'Upload video file (.mp4, .webm)'}</span>
                          </button>

                          <div className="text-[10px] text-center text-slate-500 font-medium uppercase tracking-wider">
                            — OR PASTE DIRECT VIDEO LINK —
                          </div>

                          {/* URL Input */}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="https://.../video.mp4"
                              value={videoUrlInput}
                              onChange={(e) => setVideoUrlInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleApplyVideoUrl();
                              }}
                              className={`flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-xs ${
                                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-black'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleApplyVideoUrl}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer shrink-0"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Video is loaded: Show Media details, Playback bar, Fit, Loop, Sound */
                        <div className="space-y-2.5">
                          {/* File Name / URL Summary Card */}
                          <div
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                              <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span
                                className="truncate font-mono text-[11px] text-slate-200"
                                title={selectedScreen.content.source === 'file' ? selectedScreen.content.fileName : selectedScreen.content.src}
                              >
                                {selectedScreen.content.source === 'file' ? selectedScreen.content.fileName : selectedScreen.content.src}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => videoFileInputRef.current?.click()}
                                title="Replace with another file"
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveVideo}
                                title="Remove video"
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Runtime Error Display */}
                          {activeVideoRuntime?.error && (
                            <div className="p-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs space-y-1">
                              <div className="font-semibold flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Video Error</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-rose-200/90">{activeVideoRuntime.error}</p>
                            </div>
                          )}

                          {/* Play/Pause Control Bar */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                            <button
                              type="button"
                              onClick={() => togglePlayPause(selectedScreen.id)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                activeVideoRuntime?.isPlaying
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {activeVideoRuntime?.isPlaying ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                  </svg>
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  <span>Play</span>
                                </>
                              )}
                            </button>

                            <span className="text-[11px] font-mono text-slate-400">
                              {activeVideoRuntime?.isLoading
                                ? 'Loading...'
                                : activeVideoRuntime?.isPlaying
                                ? 'Playing'
                                : 'Paused'}
                            </span>
                          </div>

                          {/* Fit, Sound & Loop Controls */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {/* Fit mode */}
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-1">FIT</label>
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleFitChange('contain')}
                                  className={`py-1 text-[10px] rounded-md font-medium border transition cursor-pointer text-center ${
                                    selectedScreen.content.fit === 'contain'
                                      ? 'bg-sky-600 text-white border-sky-500'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                  }`}
                                  title="Contain video with letterbox bars"
                                >
                                  Contain
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFitChange('cover')}
                                  className={`py-1 text-[10px] rounded-md font-medium border transition cursor-pointer text-center ${
                                    selectedScreen.content.fit === 'cover'
                                      ? 'bg-sky-600 text-white border-sky-500'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                  }`}
                                  title="Fill screen (crops edges)"
                                >
                                  Cover
                                </button>
                              </div>
                            </div>

                            {/* Loop Toggle */}
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-1">LOOP</label>
                              <button
                                type="button"
                                onClick={handleToggleLoop}
                                className={`w-full py-1 text-[11px] rounded-md font-medium border transition cursor-pointer ${
                                  selectedScreen.content.loop
                                    ? 'bg-sky-600 text-white border-sky-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {selectedScreen.content.loop ? 'On' : 'Off'}
                              </button>
                            </div>

                            {/* Sound Toggle */}
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-1">SOUND</label>
                              <button
                                type="button"
                                onClick={handleToggleSound}
                                className={`w-full py-1 text-[11px] rounded-md font-medium border transition cursor-pointer ${
                                  !selectedScreen.content.muted
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                }`}
                                title={selectedScreen.content.muted ? 'Click to unmute' : 'Click to mute'}
                              >
                                {selectedScreen.content.muted ? 'Muted' : 'Sound On'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Found in Model (Adopt tagged SCREEN_* meshes) */}
            {unadoptedTaggedScreens.length > 0 && (
              <div className="pt-3 border-t border-inherit space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Found in Model ({unadoptedTaggedScreens.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Phase 1 Target</span>
                </div>

                <div className="space-y-1.5">
                  {unadoptedTaggedScreens.map((s) => (
                    <div
                      key={s.name}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="overflow-hidden mr-2">
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-[10px] opacity-75 font-mono">
                          {s.width} × {s.height} m ({s.aspectRatio})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => adoptTaggedScreen(s.name, modelData)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition shadow-sm shrink-0 cursor-pointer"
                      >
                        Use as screen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Import / Export */}
            <div className="pt-3 border-t border-inherit flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition cursor-pointer text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export layout</span>
              </button>

              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition cursor-pointer text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Import layout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
