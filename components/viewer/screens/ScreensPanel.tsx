'use client';

import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Crosshair,
  Copy,
  Trash2,
  Move,
  RotateCw,
  RefreshCw,
  Lock,
  Unlock,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Download,
  Tv,
  Check,
  PanelRightClose,
} from 'lucide-react';
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
  onToast: (type: 'info' | 'success' | 'error', message: string) => void;
  orbitTargetRef?: React.RefObject<THREE.Vector3 | null>;
  cameraRef?: React.RefObject<THREE.Camera | null>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface WebControlsSectionProps {
  screen: ScreenData & { content: { type: 'url'; url: string } };
  mode: ViewerMode;
  onToast: (type: 'info' | 'success' | 'error', message: string) => void;
  updateScreen: (id: string, patch: Partial<ScreenData>, persistImmediate?: boolean) => void;
  reloadWebScreen: (screenId: string) => void;
  interactiveScreenId: string | null;
  setInteractiveScreenId: (id: string | null) => void;
}

const WebControlsSection: React.FC<WebControlsSectionProps> = ({
  screen,
  mode,
  onToast,
  updateScreen,
  reloadWebScreen,
  interactiveScreenId,
  setInteractiveScreenId,
}) => {
  const [urlInput, setUrlInput] = useState(screen.content.url || '');

  const handleApply = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onToast('error', 'Please enter a URL.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      onToast('error', 'URL must start with http:// or https://');
      return;
    }
    updateScreen(screen.id, { content: { type: 'url', url: trimmed } }, true);
    onToast('success', 'Web page URL applied.');
  };

  return (
    <div className="space-y-2 pt-1">
      {/* URL Input Row */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-medium text-[var(--text-muted)]">Web Page URL</label>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="https://example.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply();
            }}
            className="flex-1 h-7 px-2 text-[11px] font-mono rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] transition"
          />
          <button
            type="button"
            onClick={handleApply}
            aria-label="Apply Web Page URL"
            className="h-7 px-2 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition cursor-pointer shrink-0"
          >
            Apply
          </button>
        </div>
      </div>

      {screen.content.url && (
        <div className="space-y-2 pt-1">
          {/* Active URL row */}
          <div className="flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[11px]">
            <span className="font-mono text-[11px] truncate text-[var(--text-secondary)] mr-2" title={screen.content.url}>
              {screen.content.url}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={screen.content.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new browser tab"
                aria-label="Open in new browser tab"
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => reloadWebScreen(screen.id)}
                title="Reload screen page"
                aria-label="Reload screen page"
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interact Toggle in Orbit Mode */}
          {mode === 'orbit' && (
            <button
              type="button"
              onClick={() =>
                setInteractiveScreenId(
                  interactiveScreenId === screen.id ? null : screen.id
                )
              }
              aria-label={interactiveScreenId === screen.id ? 'Exit Screen Interaction' : 'Interact with Screen'}
              className={`w-full h-7 px-2 text-[11px] font-medium rounded-[var(--radius-sm)] border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                interactiveScreenId === screen.id
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-default)]'
              }`}
            >
              <span>{interactiveScreenId === screen.id ? 'Exit Interaction' : 'Interact with Screen'}</span>
            </button>
          )}

          {/* Virtual Resolution */}
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
            <div className="text-[11px] font-medium text-[var(--text-muted)]">Virtual Resolution</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] px-2 h-7">
                <span className="text-[10px] text-[var(--text-muted)] mr-1">W</span>
                <input
                  type="number"
                  min={320}
                  max={7680}
                  aria-label="Virtual Width in pixels"
                  value={screen.pixelWidth || 1920}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (Number.isFinite(val) && val >= 320) {
                      updateScreen(screen.id, { pixelWidth: val });
                    }
                  }}
                  className="w-full bg-transparent font-mono text-[11px] text-[var(--text-primary)] outline-none"
                />
                <span className="text-[10px] text-[var(--text-muted)]">px</span>
              </div>
              <div className="flex items-center rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] px-2 h-7">
                <span className="text-[10px] text-[var(--text-muted)] mr-1">H</span>
                <input
                  type="number"
                  min={240}
                  max={4320}
                  aria-label="Virtual Height in pixels"
                  value={screen.pixelHeight || 1080}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (Number.isFinite(val) && val >= 240) {
                      updateScreen(screen.id, { pixelHeight: val });
                    }
                  }}
                  className="w-full bg-transparent font-mono text-[11px] text-[var(--text-primary)] outline-none"
                />
                <span className="text-[10px] text-[var(--text-muted)]">px</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-0.5">
            Pages that block embedding will appear blank. Your own apps work when they allow framing.
          </p>
        </div>
      )}
    </div>
  );
};

export const ScreensPanel: React.FC<ScreensPanelProps> = ({
  modelData,
  mode,
  onToast,
  orbitTargetRef,
  cameraRef,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // Collapsible section states
  const [sectionScreensOpen, setSectionScreensOpen] = useState(true);
  const [sectionTransformOpen, setSectionTransformOpen] = useState(true);
  const [sectionContentOpen, setSectionContentOpen] = useState(true);
  const [sectionFoundOpen, setSectionFoundOpen] = useState(true);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const screens = useScreensStore((s) => s.screens);
  const selectedScreenId = useScreensStore((s) => s.selectedScreenId);
  const isEditing = useScreensStore((s) => s.isEditing);
  const gizmoMode = useScreensStore((s) => s.gizmoMode);
  const isPlacingOnSurface = useScreensStore((s) => s.isPlacingOnSurface);
  const adoptedMeshNames = useScreensStore((s) => s.adoptedMeshNames);
  const videoRuntime = useScreensStore((s) => s.videoRuntime);
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);
  const setInteractiveScreenId = useScreensStore((s) => s.setInteractiveScreenId);
  const reloadWebScreen = useScreensStore((s) => s.reloadWebScreen);

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

  if (!modelData || isCollapsed) return null;

  const selectedScreen = screens.find((s) => s.id === selectedScreenId) || null;

  const unadoptedTaggedScreens = modelData.screens.filter(
    (s) => !adoptedMeshNames.includes(s.name)
  );

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

  const diagonalInches = selectedScreen
    ? (Math.hypot(selectedScreen.width, selectedScreen.height) / 0.0254).toFixed(1)
    : '0';

  const activeVideoRuntime = selectedScreen ? videoRuntime[selectedScreen.id] : undefined;

  const handleContentTypeChange = (type: 'none' | 'video' | 'url') => {
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
    } else if (type === 'url') {
      if (selectedScreen.content.type !== 'url') {
        updateScreen(
          selectedScreen.id,
          {
            content: {
              type: 'url',
              url: '',
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
      onToast('info', 'Warning: Video file is over 200 MB.');
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
  };

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
        onToast('error', res.error || 'Failed to import layout.');
      }
    };
    reader.onerror = () => {
      onToast('error', 'Failed to read JSON file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside
      aria-label="Screens & Display Inspector"
      className="w-[300px] h-full flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border-default)] text-[var(--text-primary)] select-none shrink-0 z-20 overflow-hidden"
    >
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Sidebar Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-default)] shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-1.5 font-medium text-[12px]">
          <Tv className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Screens</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-muted)]">
            {screens.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* View / Edit Mode Toggle */}
          <button
            type="button"
            onClick={() => setEditing(!isEditing)}
            title={isEditing ? 'Presentation mode (Hide gizmos)' : 'Editing mode (Show gizmos)'}
            aria-label={isEditing ? 'Switch to presentation view' : 'Switch to edit mode'}
            className={`px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-medium border transition cursor-pointer ${
              isEditing
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isEditing ? 'Edit' : 'View'}
          </button>

          {/* Close Sidebar Toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse inspector sidebar"
              title="Collapse inspector sidebar"
              className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] text-[12px]">
        {/* SECTION 1: SCREENS LIST & CREATION */}
        <section className="p-3 space-y-2">
          {/* Header & Collapse Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSectionScreensOpen(!sectionScreensOpen)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition"
            >
              {sectionScreensOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Screen List</span>
            </button>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddScreen}
                aria-label="Add new screen"
                title="Add new screen"
                className="h-6 px-2 rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>

              {selectedScreen && (
                <button
                  type="button"
                  onClick={() => setPlacingOnSurface(!isPlacingOnSurface)}
                  title="Click any spot on the model to place screen"
                  aria-label="Place screen on surface"
                  className={`h-6 px-2 rounded-[var(--radius-sm)] text-[11px] font-medium border transition flex items-center gap-1 cursor-pointer ${
                    isPlacingOnSurface
                      ? 'bg-[var(--status-warning)] text-black border-[var(--status-warning)]'
                      : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{isPlacingOnSurface ? 'Placing...' : 'Place'}</span>
                </button>
              )}
            </div>
          </div>

          {sectionScreensOpen && (
            <div className="space-y-1">
              {screens.length > 0 ? (
                <div className="space-y-0.5 max-h-44 overflow-y-auto pr-0.5">
                  {screens.map((screen) => {
                    const isSelected = screen.id === selectedScreenId;
                    return (
                      <div
                        key={screen.id}
                        onClick={() => selectScreen(screen.id)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-sm)] border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent-text)] font-medium'
                            : 'bg-transparent border-transparent hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-1">
                          {editingNameId === screen.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={tempName}
                              aria-label="Rename screen"
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
                              className="px-1 h-5 rounded-[var(--radius-sm)] text-[11px] bg-[var(--bg-app)] border border-[var(--border-focus)] text-white w-full outline-none font-sans"
                            />
                          ) : (
                            <span
                              className="truncate text-[12px] cursor-text"
                              onDoubleClick={() => {
                                setEditingNameId(screen.id);
                                setTempName(screen.name);
                              }}
                              title="Double-click to rename"
                            >
                              {screen.name}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                            {screen.width}×{screen.height}m
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => duplicateScreen(screen.id)}
                            title="Duplicate screen"
                            aria-label="Duplicate screen"
                            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteScreen(screen.id)}
                            title="Delete screen"
                            aria-label="Delete screen"
                            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--bg-surface-active)] transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)] py-2">
                  No screens created. Click Add to create one.
                </p>
              )}
            </div>
          )}
        </section>

        {/* SECTION 2: TRANSFORM INSPECTOR */}
        {selectedScreen && (
          <section className="p-3 space-y-2.5">
            <button
              type="button"
              onClick={() => setSectionTransformOpen(!sectionTransformOpen)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition"
            >
              <div className="flex items-center gap-1">
                {sectionTransformOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Transform</span>
              </div>
            </button>

            {sectionTransformOpen && (
              <div className="space-y-2 pt-0.5">
                {/* Gizmo Mode Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setGizmoMode('translate')}
                    aria-label="Move Gizmo"
                    title="Move Gizmo"
                    className={`flex-1 h-6 text-[11px] font-medium rounded-[var(--radius-sm)] border transition flex items-center justify-center gap-1 cursor-pointer ${
                      gizmoMode === 'translate'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Move className="w-3 h-3" />
                    <span>Move</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGizmoMode('rotate')}
                    aria-label="Rotate Gizmo"
                    title="Rotate Gizmo"
                    className={`flex-1 h-6 text-[11px] font-medium rounded-[var(--radius-sm)] border transition flex items-center justify-center gap-1 cursor-pointer ${
                      gizmoMode === 'rotate'
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => flipFacing(selectedScreen.id)}
                    aria-label="Flip facing 180 degrees"
                    title="Flip facing 180°"
                    className="h-6 px-2 text-[11px] font-medium rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>180°</span>
                  </button>
                </div>

                {/* Dimensions: Width & Height Property Rows */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">Dimensions</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateScreen(selectedScreen.id, { isAspectLocked: !selectedScreen.isAspectLocked }, true)
                      }
                      title={selectedScreen.isAspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                      aria-label={selectedScreen.isAspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                      className={`p-1 rounded-[var(--radius-sm)] transition cursor-pointer ${
                        selectedScreen.isAspectLocked
                          ? 'text-[var(--accent-text)] bg-[var(--accent-subtle)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {selectedScreen.isAspectLocked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Width Row */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="screen-width-input" className="text-[11px] text-[var(--text-muted)] w-14 shrink-0">Width</label>
                    <div className="flex-1 flex items-center h-6 px-2 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]">
                      <input
                        id="screen-width-input"
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={selectedScreen.width}
                        onChange={(e) => handleWidthChange(e.target.value)}
                        className="w-full bg-transparent font-mono text-[11px] text-[var(--text-primary)] outline-none"
                      />
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">m</span>
                    </div>
                  </div>

                  {/* Height Row */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="screen-height-input" className="text-[11px] text-[var(--text-muted)] w-14 shrink-0">Height</label>
                    <div className="flex-1 flex items-center h-6 px-2 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]">
                      <input
                        id="screen-height-input"
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={selectedScreen.height}
                        onChange={(e) => handleHeightChange(e.target.value)}
                        className="w-full bg-transparent font-mono text-[11px] text-[var(--text-primary)] outline-none"
                      />
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">m</span>
                    </div>
                  </div>

                  {/* Aspect Ratio Selector Row */}
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="screen-aspect-select" className="text-[11px] text-[var(--text-muted)] w-14 shrink-0">Aspect</label>
                    <select
                      id="screen-aspect-select"
                      value={selectedScreen.aspect}
                      onChange={(e) => handleAspectPresetChange(e.target.value as ScreenAspect)}
                      className="flex-1 h-6 px-1.5 text-[11px] font-mono rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    >
                      <option value="16:9">16:9 (Standard)</option>
                      <option value="21:9">21:9 (Ultrawide)</option>
                      <option value="4:3">4:3 (Classic)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* Diagonal Size Row */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[var(--text-muted)]">Diagonal</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {diagonalInches}&quot; ({Math.hypot(selectedScreen.width, selectedScreen.height).toFixed(2)} m)
                    </span>
                  </div>
                </div>

                {/* Coordinates & Angles */}
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Position</span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {selectedScreen.position[0].toFixed(2)}m, {selectedScreen.position[1].toFixed(2)}m, {selectedScreen.position[2].toFixed(2)}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Rotation</span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {eulerDeg.y}°, {eulerDeg.x}°, {eulerDeg.z}°
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: CONTENT INSPECTOR */}
        {selectedScreen && (
          <section className="p-3 space-y-2">
            <button
              type="button"
              onClick={() => setSectionContentOpen(!sectionContentOpen)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition"
            >
              <div className="flex items-center gap-1">
                {sectionContentOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Content</span>
              </div>
            </button>

            {sectionContentOpen && (
              <div className="space-y-2 pt-0.5">
                {/* Content Type Segmented Control */}
                <div
                  role="group"
                  aria-label="Screen Content Type"
                  className="grid grid-cols-3 gap-1 p-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]"
                >
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('none')}
                    aria-pressed={selectedScreen.content.type === 'none'}
                    className={`h-6 text-[11px] font-medium rounded-[var(--radius-sm)] transition cursor-pointer ${
                      selectedScreen.content.type === 'none'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('video')}
                    aria-pressed={selectedScreen.content.type === 'video'}
                    className={`h-6 text-[11px] font-medium rounded-[var(--radius-sm)] transition cursor-pointer ${
                      selectedScreen.content.type === 'video'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentTypeChange('url')}
                    aria-pressed={selectedScreen.content.type === 'url'}
                    className={`h-6 text-[11px] font-medium rounded-[var(--radius-sm)] transition cursor-pointer ${
                      selectedScreen.content.type === 'url'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Web page
                  </button>
                </div>

                {/* Video Controls */}
                {selectedScreen.content.type === 'video' && (
                  <div className="space-y-2 pt-1">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept=".mp4,.webm,video/mp4,video/webm"
                      className="hidden"
                      onChange={handleVideoFileUpload}
                    />

                    {(selectedScreen.content.source === 'file' && !selectedScreen.content.videoId) ||
                    (selectedScreen.content.source === 'url' && !selectedScreen.content.src) ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          disabled={isUploadingVideo}
                          onClick={() => videoFileInputRef.current?.click()}
                          className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingVideo ? 'Uploading...' : 'Upload video file'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="https://.../video.mp4"
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleApplyVideoUrl();
                            }}
                            className="flex-1 h-7 px-2 text-[11px] font-mono rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyVideoUrl}
                            className="h-7 px-2 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition cursor-pointer shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Video summary row */}
                        <div className="flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[11px]">
                          <span
                            className="truncate font-mono text-[11px] text-[var(--text-secondary)] mr-2"
                            title={selectedScreen.content.source === 'file' ? selectedScreen.content.fileName : selectedScreen.content.src}
                          >
                            {selectedScreen.content.source === 'file' ? selectedScreen.content.fileName : selectedScreen.content.src}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => videoFileInputRef.current?.click()}
                              className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveVideo}
                              className="px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--status-error)] transition cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Error message */}
                        {activeVideoRuntime?.error && (
                          <div className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--status-error)]/40 bg-[var(--status-error)]/10 text-[var(--status-error)] text-[11px]">
                            {activeVideoRuntime.error}
                          </div>
                        )}

                        {/* Playback bar */}
                        <div className="flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)]">
                          <button
                            type="button"
                            onClick={() => togglePlayPause(selectedScreen.id)}
                            className="h-6 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center gap-1 transition cursor-pointer"
                          >
                            {activeVideoRuntime?.isPlaying ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Play</span>
                              </>
                            )}
                          </button>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {activeVideoRuntime?.isLoading
                              ? 'Loading...'
                              : activeVideoRuntime?.isPlaying
                              ? 'Playing'
                              : 'Paused'}
                          </span>
                        </div>

                        {/* Fit, Loop, Sound Controls */}
                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Fit</span>
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleFitChange('contain')}
                                className={`flex-1 h-6 text-[10px] rounded-[var(--radius-sm)] border transition cursor-pointer ${
                                  selectedScreen.content.fit === 'contain'
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-medium'
                                    : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                Box
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFitChange('cover')}
                                className={`flex-1 h-6 text-[10px] rounded-[var(--radius-sm)] border transition cursor-pointer ${
                                  selectedScreen.content.fit === 'cover'
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-medium'
                                    : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                Fill
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Loop</span>
                            <button
                              type="button"
                              onClick={handleToggleLoop}
                              className={`w-full h-6 text-[10px] rounded-[var(--radius-sm)] border transition cursor-pointer ${
                                selectedScreen.content.loop
                                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-medium'
                                  : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {selectedScreen.content.loop ? 'On' : 'Off'}
                            </button>
                          </div>

                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">Sound</span>
                            <button
                              type="button"
                              onClick={handleToggleSound}
                              className={`w-full h-6 text-[10px] rounded-[var(--radius-sm)] border transition flex items-center justify-center gap-1 cursor-pointer ${
                                !selectedScreen.content.muted
                                  ? 'bg-[var(--status-success)] text-white border-[var(--status-success)] font-medium'
                                  : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {!selectedScreen.content.muted ? (
                                <Volume2 className="w-3 h-3" />
                              ) : (
                                <VolumeX className="w-3 h-3" />
                              )}
                              <span>{!selectedScreen.content.muted ? 'On' : 'Mute'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Web Page Controls */}
                {selectedScreen.content.type === 'url' && (
                  <WebControlsSection
                    key={`${selectedScreen.id}-${selectedScreen.content.url}`}
                    screen={selectedScreen as ScreenData & { content: { type: 'url'; url: string } }}
                    mode={mode}
                    onToast={onToast}
                    updateScreen={updateScreen}
                    reloadWebScreen={reloadWebScreen}
                    interactiveScreenId={interactiveScreenId}
                    setInteractiveScreenId={setInteractiveScreenId}
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4: FOUND IN MODEL */}
        {unadoptedTaggedScreens.length > 0 && (
          <section className="p-3 space-y-2">
            <button
              type="button"
              onClick={() => setSectionFoundOpen(!sectionFoundOpen)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition"
            >
              <div className="flex items-center gap-1">
                {sectionFoundOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Found in Model ({unadoptedTaggedScreens.length})</span>
              </div>
            </button>

            {sectionFoundOpen && (
              <div className="space-y-1 pt-0.5">
                {unadoptedTaggedScreens.map((s) => (
                  <div
                    key={s.name}
                    className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] flex items-center justify-between text-[11px]"
                  >
                    <div className="overflow-hidden mr-2">
                      <div className="font-mono truncate text-[var(--text-primary)]">{s.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {s.width} × {s.height} m ({s.aspectRatio})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => adoptTaggedScreen(s.name, modelData)}
                      className="h-5 px-1.5 rounded-[var(--radius-sm)] text-[10px] font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Adopt</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sidebar Footer: Layout Export & Import */}
      <div className="p-2 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
        >
          <Download className="w-3 h-3" />
          <span>Export Layout</span>
        </button>
        <button
          type="button"
          onClick={() => importFileInputRef.current?.click()}
          className="flex-1 h-7 px-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
        >
          <Upload className="w-3 h-3" />
          <span>Import Layout</span>
        </button>
      </div>
    </aside>
  );
};
