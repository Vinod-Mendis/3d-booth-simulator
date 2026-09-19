'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { ScreenData, LoadedModelData, GizmoMode, ViewerMode } from '@/lib/types';
import { useScreensStore, nativeToWorldPos, worldToNativePos } from '@/lib/screensStore';

interface ScreenGizmoProps {
  screen: ScreenData;
  modelData: LoadedModelData;
  gizmoMode: GizmoMode;
  viewerMode: ViewerMode;
  onDraggingChange: (isDragging: boolean) => void;
}

export const ScreenGizmo: React.FC<ScreenGizmoProps> = ({
  screen,
  modelData,
  gizmoMode,
  viewerMode,
  onDraggingChange,
}) => {
  const dummy = useMemo(() => new THREE.Group(), []);
  const isDraggingRef = useRef(false);
  const updateScreen = useScreensStore((s) => s.updateScreen);
  const setGizmoMode = useScreensStore((s) => s.setGizmoMode);

  // Sync dummy object to screen's world transform whenever screen changes (if not dragging)
  useEffect(() => {
    if (isDraggingRef.current) return;

    const worldPos = nativeToWorldPos(screen.position, modelData);
    dummy.position.copy(worldPos);
    dummy.quaternion.set(...screen.quaternion);
  }, [screen.id, screen.position, screen.quaternion, modelData, dummy]);

  // Keyboard shortcuts for gizmo mode in Orbit mode only (G/T for Move, R for Rotate)
  useEffect(() => {
    if (viewerMode !== 'orbit') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'g' || e.key === 'G' || e.key === 't' || e.key === 'T') {
        setGizmoMode('translate');
      } else if (e.key === 'r' || e.key === 'R') {
        setGizmoMode('rotate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerMode, setGizmoMode]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    onDraggingChange(true);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    onDraggingChange(false);

    // Persist immediately to localStorage when dragging ends
    const nativePos = worldToNativePos(dummy.position, modelData);
    const nativeQuat: [number, number, number, number] = [
      Number(dummy.quaternion.x.toFixed(5)),
      Number(dummy.quaternion.y.toFixed(5)),
      Number(dummy.quaternion.z.toFixed(5)),
      Number(dummy.quaternion.w.toFixed(5)),
    ];
    updateScreen(screen.id, { position: nativePos, quaternion: nativeQuat }, true);
  };

  const handleObjectChange = () => {
    const nativePos = worldToNativePos(dummy.position, modelData);
    const nativeQuat: [number, number, number, number] = [
      Number(dummy.quaternion.x.toFixed(5)),
      Number(dummy.quaternion.y.toFixed(5)),
      Number(dummy.quaternion.z.toFixed(5)),
      Number(dummy.quaternion.w.toFixed(5)),
    ];
    // Live update store state (debounced localStorage save)
    updateScreen(screen.id, { position: nativePos, quaternion: nativeQuat }, false);
  };

  return (
    <>
      <primitive object={dummy} />
      <TransformControls
        object={dummy}
        mode={gizmoMode}
        size={0.75}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onObjectChange={handleObjectChange}
      />
    </>
  );
};
