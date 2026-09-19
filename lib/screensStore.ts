import { create } from 'zustand';
import * as THREE from 'three';
import { ScreenData, ScreenAspect, GizmoMode, ScreensLayoutExport, LoadedModelData, VideoRuntimeState } from './types';
import { deleteVideo } from './videoStore';

export const ASPECT_RATIOS: Record<Exclude<ScreenAspect, 'custom'>, number> = {
  '16:9': 16 / 9,
  '21:9': 21 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '9:16': 9 / 16,
};

/**
 * Coordinate transform: Native Model Space <-> World Space
 */
export function nativeToWorldPos(
  nativePos: [number, number, number] | THREE.Vector3,
  modelData: LoadedModelData
): THREE.Vector3 {
  const nx = Array.isArray(nativePos) ? nativePos[0] : nativePos.x;
  const ny = Array.isArray(nativePos) ? nativePos[1] : nativePos.y;
  const nz = Array.isArray(nativePos) ? nativePos[2] : nativePos.z;

  const { scaleFactor, nativeCenter, nativeBoundingBox } = modelData;
  return new THREE.Vector3(
    (nx - nativeCenter.x) * scaleFactor,
    (ny - nativeBoundingBox.min.y) * scaleFactor,
    (nz - nativeCenter.z) * scaleFactor
  );
}

export function worldToNativePos(
  worldPos: [number, number, number] | THREE.Vector3,
  modelData: LoadedModelData
): [number, number, number] {
  const wx = Array.isArray(worldPos) ? worldPos[0] : worldPos.x;
  const wy = Array.isArray(worldPos) ? worldPos[1] : worldPos.y;
  const wz = Array.isArray(worldPos) ? worldPos[2] : worldPos.z;

  const { scaleFactor, nativeCenter, nativeBoundingBox } = modelData;
  const safeScale = scaleFactor > 0 ? scaleFactor : 1;

  const nx = wx / safeScale + nativeCenter.x;
  const ny = wy / safeScale + nativeBoundingBox.min.y;
  const nz = wz / safeScale + nativeCenter.z;

  return [Number(nx.toFixed(4)), Number(ny.toFixed(4)), Number(nz.toFixed(4))];
}

interface ScreensState {
  screens: ScreenData[];
  selectedScreenId: string | null;
  isEditing: boolean;
  gizmoMode: GizmoMode;
  isPlacingOnSurface: boolean;
  storageKey: string | null;
  adoptedMeshNames: string[];
  videoRuntime: Record<string, VideoRuntimeState>;
  focusedVideoScreenId: string | null;

  // Actions
  addScreen: (screen: ScreenData) => void;
  updateScreen: (id: string, patch: Partial<ScreenData>, persistImmediate?: boolean) => void;
  deleteScreen: (id: string) => void;
  duplicateScreen: (id: string) => void;
  selectScreen: (id: string | null) => void;
  setEditing: (isEditing: boolean) => void;
  setGizmoMode: (mode: GizmoMode) => void;
  setPlacingOnSurface: (active: boolean) => void;
  flipFacing: (id: string) => void;
  syncModel: (modelData: LoadedModelData | null) => void;
  adoptTaggedScreen: (meshName: string, modelData: LoadedModelData) => void;
  exportLayout: () => string;
  importLayout: (jsonStr: string, modelData: LoadedModelData | null) => { success: boolean; error?: string };
  setVideoRuntime: (screenId: string, state: Partial<VideoRuntimeState>) => void;
  togglePlayPause: (screenId: string) => void;
  setEligibleScreens: (eligibleScreenIds: string[]) => void;
  setFocusedVideoScreenId: (id: string | null) => void;
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(key: string, screens: ScreenData[], adoptedMeshNames: string[]) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    try {
      const payload: ScreensLayoutExport = {
        version: 1,
        modelStorageKey: key,
        screens,
        adoptedMeshNames,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to persist screens to localStorage:', e);
    }
  }, 300);
}

function immediateSave(key: string, screens: ScreenData[], adoptedMeshNames: string[]) {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  try {
    const payload: ScreensLayoutExport = {
      version: 1,
      modelStorageKey: key,
      screens,
      adoptedMeshNames,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to immediately save screens to localStorage:', e);
  }
}

/**
 * Validates layout structure and ensures values are positive and finite.
 */
export function validateLayoutData(data: unknown): { valid: boolean; error?: string; layout?: ScreensLayoutExport } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid layout JSON: expected an object.' };
  }

  const exportObj = data as Partial<ScreensLayoutExport>;
  if (!Array.isArray(exportObj.screens)) {
    return { valid: false, error: 'Invalid layout JSON: "screens" must be an array.' };
  }

  for (let i = 0; i < exportObj.screens.length; i++) {
    const s = exportObj.screens[i];
    if (!s || typeof s !== 'object') {
      return { valid: false, error: `Screen at index ${i} is not a valid object.` };
    }
    if (typeof s.id !== 'string' || !s.id) {
      return { valid: false, error: `Screen at index ${i} is missing a valid id.` };
    }
    if (typeof s.name !== 'string' || !s.name) {
      return { valid: false, error: `Screen "${s.id}" is missing a valid name.` };
    }
    if (typeof s.width !== 'number' || !Number.isFinite(s.width) || s.width <= 0) {
      return { valid: false, error: `Screen "${s.name}" has invalid width.` };
    }
    if (typeof s.height !== 'number' || !Number.isFinite(s.height) || s.height <= 0) {
      return { valid: false, error: `Screen "${s.name}" has invalid height.` };
    }
    if (!Array.isArray(s.position) || s.position.length !== 3 || s.position.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
      return { valid: false, error: `Screen "${s.name}" has invalid position coordinates.` };
    }
    if (!Array.isArray(s.quaternion) || s.quaternion.length !== 4 || s.quaternion.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
      return { valid: false, error: `Screen "${s.name}" has invalid quaternion coordinates.` };
    }

    // Validate content URLs and file references
    if (s.content && typeof s.content === 'object') {
      if (s.content.type === 'url') {
        const urlStr = s.content.url;
        if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
          return { valid: false, error: `Screen "${s.name}" has an invalid web URL (must start with http:// or https://).` };
        }
      }
      if (s.content.type === 'video') {
        if (s.content.source === 'url') {
          const urlStr = s.content.src;
          if (!urlStr || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
            return { valid: false, error: `Screen "${s.name}" has an invalid video URL (must start with http:// or https://).` };
          }
        } else if (s.content.source === 'file') {
          if (typeof s.content.videoId !== 'string' || !s.content.videoId) {
            return { valid: false, error: `Screen "${s.name}" has an invalid file videoId.` };
          }
        }
      }
    }
  }

  return {
    valid: true,
    layout: {
      version: 1,
      modelStorageKey: exportObj.modelStorageKey || 'default',
      screens: exportObj.screens as ScreenData[],
      adoptedMeshNames: Array.isArray(exportObj.adoptedMeshNames) ? exportObj.adoptedMeshNames : [],
    },
  };
}

export const useScreensStore = create<ScreensState>((set, get) => ({
  screens: [],
  selectedScreenId: null,
  isEditing: true,
  gizmoMode: 'translate',
  isPlacingOnSurface: false,
  storageKey: null,
  adoptedMeshNames: [],
  videoRuntime: {},
  focusedVideoScreenId: null,

  addScreen: (newScreen: ScreenData) => {
    set((state) => {
      const updated = [...state.screens, newScreen];
      if (state.storageKey) {
        debouncedSave(state.storageKey, updated, state.adoptedMeshNames);
      }
      return {
        screens: updated,
        selectedScreenId: newScreen.id,
        isPlacingOnSurface: false,
      };
    });
  },

  updateScreen: (id: string, patch: Partial<ScreenData>, persistImmediate = false) => {
    // Check if replacing a file video and delete unreferenced blob
    const oldScreen = get().screens.find((s) => s.id === id);
    if (
      oldScreen?.content.type === 'video' &&
      oldScreen.content.source === 'file' &&
      patch.content &&
      (patch.content.type !== 'video' || patch.content.source !== 'file' || patch.content.videoId !== oldScreen.content.videoId)
    ) {
      const oldVidId = oldScreen.content.videoId;
      const otherUsing = get().screens.some(
        (s) => s.id !== id && s.content.type === 'video' && s.content.source === 'file' && s.content.videoId === oldVidId
      );
      if (!otherUsing) {
        deleteVideo(oldVidId).catch((err) => console.warn('Failed to delete unreferenced video:', err));
      }
    }

    set((state) => {
      const updated = state.screens.map((screen) => {
        if (screen.id !== id) return screen;
        return { ...screen, ...patch };
      });

      if (state.storageKey) {
        if (persistImmediate) {
          immediateSave(state.storageKey, updated, state.adoptedMeshNames);
        } else {
          debouncedSave(state.storageKey, updated, state.adoptedMeshNames);
        }
      }

      return { screens: updated };
    });
  },

  deleteScreen: (id: string) => {
    const screenToDelete = get().screens.find((s) => s.id === id);
    if (screenToDelete?.content.type === 'video' && screenToDelete.content.source === 'file') {
      const vidId = screenToDelete.content.videoId;
      const otherUsing = get().screens.some(
        (s) => s.id !== id && s.content.type === 'video' && s.content.source === 'file' && s.content.videoId === vidId
      );
      if (!otherUsing) {
        deleteVideo(vidId).catch((err) => console.warn('Failed to delete unreferenced video:', err));
      }
    }

    set((state) => {
      const updated = state.screens.filter((s) => s.id !== id);
      const nextSelected = state.selectedScreenId === id ? null : state.selectedScreenId;
      const nextRuntime = { ...state.videoRuntime };
      delete nextRuntime[id];

      if (state.storageKey) {
        immediateSave(state.storageKey, updated, state.adoptedMeshNames);
      }
      return { screens: updated, selectedScreenId: nextSelected, videoRuntime: nextRuntime };
    });
  },

  duplicateScreen: (id: string) => {
    const screen = get().screens.find((s) => s.id === id);
    if (!screen) return;

    // Offset 0.3m in native space horizontally
    const newPos: [number, number, number] = [
      screen.position[0] + 0.3,
      screen.position[1],
      screen.position[2] + 0.1,
    ];

    const duplicated: ScreenData = {
      ...screen,
      id: `screen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${screen.name} (Copy)`,
      position: newPos,
    };

    get().addScreen(duplicated);
  },

  selectScreen: (id: string | null) => {
    set({ selectedScreenId: id });
  },

  setEditing: (isEditing: boolean) => {
    set({ isEditing });
  },

  setGizmoMode: (gizmoMode: GizmoMode) => {
    set({ gizmoMode });
  },

  setPlacingOnSurface: (isPlacingOnSurface: boolean) => {
    set({ isPlacingOnSurface });
  },

  flipFacing: (id: string) => {
    const screen = get().screens.find((s) => s.id === id);
    if (!screen) return;

    const q = new THREE.Quaternion(...screen.quaternion);
    const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    q.multiply(flip);

    get().updateScreen(
      id,
      { quaternion: [Number(q.x.toFixed(5)), Number(q.y.toFixed(5)), Number(q.z.toFixed(5)), Number(q.w.toFixed(5))] },
      true
    );
  },

  syncModel: (modelData: LoadedModelData | null) => {
    const current = get();

    // 8. Save previous layout under old key
    if (current.storageKey && current.screens.length > 0) {
      immediateSave(current.storageKey, current.screens, current.adoptedMeshNames);
    }

    if (!modelData) {
      set({
        storageKey: null,
        screens: [],
        selectedScreenId: null,
        adoptedMeshNames: [],
      });
      return;
    }

    // Build unique model storage key from name and native bounding size
    const sanitizedName = modelData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sizeStr = `${modelData.nativeSize.x.toFixed(2)}_${modelData.nativeSize.y.toFixed(2)}_${modelData.nativeSize.z.toFixed(2)}`;
    const newStorageKey = `screens_${sanitizedName}_${sizeStr}`;

    let loadedScreens: ScreenData[] = [];
    let loadedAdoptedNames: string[] = [];

    try {
      const savedRaw = localStorage.getItem(newStorageKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        const val = validateLayoutData(parsed);
        if (val.valid && val.layout) {
          loadedScreens = val.layout.screens;
          loadedAdoptedNames = val.layout.adoptedMeshNames;
        }
      }
    } catch (e) {
      console.warn('Error reading saved screens:', e);
    }

    // Re-hide adopted meshes in the newly loaded model
    if (loadedAdoptedNames.length > 0) {
      modelData.object.traverse((child) => {
        if (child.name && loadedAdoptedNames.includes(child.name)) {
          child.visible = false;
        }
      });
    }

    set({
      storageKey: newStorageKey,
      screens: loadedScreens,
      selectedScreenId: null,
      adoptedMeshNames: loadedAdoptedNames,
      isPlacingOnSurface: false,
    });
  },

  adoptTaggedScreen: (meshName: string, modelData: LoadedModelData) => {
    let targetMesh: THREE.Mesh | null = null;
    modelData.object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.name === meshName) {
        targetMesh = child as THREE.Mesh;
      }
    });

    if (!targetMesh) return;

    // Find screen info from modelData
    const screenInfo = modelData.screens.find((s) => s.name === meshName);
    const width = screenInfo ? screenInfo.width : 3.2;
    const height = screenInfo ? screenInfo.height : 1.8;
    const aspect: ScreenAspect = (screenInfo?.aspectRatio as ScreenAspect) || '16:9';

    // Compute native position and orientation of the mesh
    (targetMesh as THREE.Mesh).updateWorldMatrix(true, false);
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    (targetMesh as THREE.Mesh).getWorldPosition(worldPos);
    (targetMesh as THREE.Mesh).getWorldQuaternion(worldQuat);

    const nativePos = worldToNativePos(worldPos, modelData);
    const nativeQuat: [number, number, number, number] = [
      Number(worldQuat.x.toFixed(5)),
      Number(worldQuat.y.toFixed(5)),
      Number(worldQuat.z.toFixed(5)),
      Number(worldQuat.w.toFixed(5)),
    ];

    // Hide original mesh in model
    (targetMesh as THREE.Mesh).visible = false;

    const newScreen: ScreenData = {
      id: `screen_adopted_${Date.now()}`,
      name: meshName,
      width,
      height,
      aspect,
      isAspectLocked: true,
      position: nativePos,
      quaternion: nativeQuat,
      pixelWidth: 1920,
      pixelHeight: Math.round(1920 / (width / height)),
      content: { type: 'none' },
    };

    set((state) => {
      const adoptedMeshNames = Array.from(new Set([...state.adoptedMeshNames, meshName]));
      const updatedScreens = [...state.screens, newScreen];
      if (state.storageKey) {
        immediateSave(state.storageKey, updatedScreens, adoptedMeshNames);
      }
      return {
        screens: updatedScreens,
        selectedScreenId: newScreen.id,
        adoptedMeshNames,
      };
    });
  },

  exportLayout: () => {
    const state = get();
    const exportData: ScreensLayoutExport = {
      version: 1,
      modelStorageKey: state.storageKey || 'default',
      screens: state.screens,
      adoptedMeshNames: state.adoptedMeshNames,
    };
    return JSON.stringify(exportData, null, 2);
  },

  importLayout: (jsonStr: string, modelData: LoadedModelData | null) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const val = validateLayoutData(parsed);
      if (!val.valid || !val.layout) {
        return { success: false, error: val.error || 'Invalid layout structure.' };
      }

      const layout = val.layout;

      // Re-hide adopted meshes
      if (modelData && layout.adoptedMeshNames.length > 0) {
        modelData.object.traverse((child) => {
          if (child.name && layout.adoptedMeshNames.includes(child.name)) {
            child.visible = false;
          }
        });
      }

      set((state) => {
        if (state.storageKey) {
          immediateSave(state.storageKey, layout.screens, layout.adoptedMeshNames);
        }
        return {
          screens: layout.screens,
          adoptedMeshNames: layout.adoptedMeshNames,
          selectedScreenId: layout.screens.length > 0 ? layout.screens[0].id : null,
        };
      });

      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'JSON parsing error.' };
    }
  },

  setVideoRuntime: (screenId: string, patch: Partial<VideoRuntimeState>) => {
    set((state) => {
      const current = state.videoRuntime[screenId] || {
        isPlaying: true,
        isReady: false,
        isLoading: false,
        error: null,
        isEligibleForPlayback: true,
      };
      return {
        videoRuntime: {
          ...state.videoRuntime,
          [screenId]: { ...current, ...patch },
        },
      };
    });
  },

  togglePlayPause: (screenId: string) => {
    const current = get().videoRuntime[screenId];
    const isPlaying = current !== undefined ? !current.isPlaying : false;
    get().setVideoRuntime(screenId, { isPlaying });
  },

  setEligibleScreens: (eligibleScreenIds: string[]) => {
    const eligibleSet = new Set(eligibleScreenIds);
    set((state) => {
      let changed = false;
      const newRuntime = { ...state.videoRuntime };
      for (const screen of state.screens) {
        if (screen.content.type === 'video') {
          const isEligible = eligibleSet.has(screen.id);
          const current = newRuntime[screen.id] || {
            isPlaying: true,
            isReady: false,
            isLoading: false,
            error: null,
            isEligibleForPlayback: true,
          };
          if (current.isEligibleForPlayback !== isEligible) {
            newRuntime[screen.id] = { ...current, isEligibleForPlayback: isEligible };
            changed = true;
          }
        }
      }
      return changed ? { videoRuntime: newRuntime } : state;
    });
  },

  setFocusedVideoScreenId: (id: string | null) => {
    set({ focusedVideoScreenId: id });
  },
}));
