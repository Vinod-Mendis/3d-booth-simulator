import type * as THREE from 'three';

export type ViewerMode = 'orbit' | 'walk';

export type UnitType = 'auto' | 'm' | 'cm' | 'mm' | 'ft' | 'in';

export interface ScreenInfo {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  mesh: THREE.Mesh;
}

export interface LoadedModelData {
  id: string;
  name: string;
  object: THREE.Group;
  nativeBoundingBox: THREE.Box3;
  nativeSize: THREE.Vector3;
  nativeCenter: THREE.Vector3;
  detectedUnit: UnitType;
  selectedUnit: UnitType;
  scaleFactor: number;
  scaledBoundingBox: THREE.Box3;
  scaledSize: THREE.Vector3;
  triangleCount: number;
  screens: ScreenInfo[];
  isSample: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'loading';
  message: string;
}

export type ScreenAspect = '16:9' | '21:9' | '4:3' | '1:1' | '9:16' | 'custom';

export type GizmoMode = 'translate' | 'rotate';

export type VideoFit = 'contain' | 'cover';

export type ScreenContent =
  | { type: 'none' }
  | {
      type: 'video';
      source: 'file';
      videoId: string;
      fileName: string;
      fit: VideoFit;
      muted: boolean;
      loop: boolean;
    }
  | {
      type: 'video';
      source: 'url';
      src: string;
      fit: VideoFit;
      muted: boolean;
      loop: boolean;
    }
  | { type: 'url'; url: string };

export interface VideoRuntimeState {
  isPlaying: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  videoAspect?: number;
  isEligibleForPlayback: boolean;
}

export interface WebRuntimeState {
  isLoading: boolean;
  isLoaded: boolean;
  loadTimeout: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isLive: boolean;
  reloadCounter: number;
}

export interface ScreenData {
  id: string;
  name: string;
  width: number; // in real-world meters
  height: number; // in real-world meters
  aspect: ScreenAspect;
  isAspectLocked: boolean;
  position: [number, number, number]; // in model native coordinate space
  quaternion: [number, number, number, number]; // in model native coordinate space [x, y, z, w]
  pixelWidth: number; // virtual resolution width (default: 1920)
  pixelHeight: number; // virtual resolution height
  content: ScreenContent;
}

export interface ScreensLayoutExport {
  version: 1;
  modelStorageKey: string;
  screens: ScreenData[];
  adoptedMeshNames: string[];
}
