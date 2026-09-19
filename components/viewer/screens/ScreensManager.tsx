'use client';

import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LoadedModelData, ViewerMode } from '@/lib/types';
import { useScreensStore, nativeToWorldPos } from '@/lib/screensStore';
import { extractCollidableMeshes } from '@/lib/collision';
import { placeScreenAtHit } from '@/lib/placeOnSurface';
import { ScreenObject } from './ScreenObject';
import { ScreenGizmo } from './ScreenGizmo';

interface ScreensManagerProps {
  modelData: LoadedModelData;
  mode: ViewerMode;
  onGizmoDraggingChange: (isDragging: boolean) => void;
}

export const ScreensManager: React.FC<ScreensManagerProps> = ({
  modelData,
  mode,
  onGizmoDraggingChange,
}) => {
  const { camera, gl } = useThree();

  const screens = useScreensStore((s) => s.screens);
  const selectedScreenId = useScreensStore((s) => s.selectedScreenId);
  const isEditing = useScreensStore((s) => s.isEditing);
  const gizmoMode = useScreensStore((s) => s.gizmoMode);
  const isPlacingOnSurface = useScreensStore((s) => s.isPlacingOnSurface);
  const selectScreen = useScreensStore((s) => s.selectScreen);
  const updateScreen = useScreensStore((s) => s.updateScreen);
  const setPlacingOnSurface = useScreensStore((s) => s.setPlacingOnSurface);
  const setEligibleScreens = useScreensStore((s) => s.setEligibleScreens);

  const selectedScreen = useMemo(() => {
    return screens.find((s) => s.id === selectedScreenId) || null;
  }, [screens, selectedScreenId]);

  // Performance Coordinator: Check every 250ms for frustum, distance <= 25m, and max 4 nearest playing videos
  useEffect(() => {
    const projScreenMatrix = new THREE.Matrix4();
    const frustum = new THREE.Frustum();

    const checkPlaybackEligibility = () => {
      if (document.hidden) {
        setEligibleScreens([]);
        return;
      }

      const videoScreens = screens.filter((s) => s.content.type === 'video');
      if (videoScreens.length === 0) {
        setEligibleScreens([]);
        return;
      }

      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);

      const eligibleCandidates: { id: string; distance: number }[] = [];

      for (const screen of videoScreens) {
        const worldPos = nativeToWorldPos(screen.position, modelData);
        const dist = camera.position.distanceTo(worldPos);

        // Max distance 25 meters
        if (dist > 25) continue;

        // View frustum and facing check
        const radius = Math.max(screen.width, screen.height) * 0.75 + 1.5;
        const sphere = new THREE.Sphere(worldPos, radius);
        const inFrustum = frustum.intersectsSphere(sphere);

        const toScreen = worldPos.clone().sub(camera.position).normalize();
        const isFacing = toScreen.dot(forward) > -0.3; // within camera forward hemisphere or periphery

        if (inFrustum || isFacing) {
          eligibleCandidates.push({ id: screen.id, distance: dist });
        }
      }

      // Sort by distance: nearest 4 are allowed to play simultaneously
      eligibleCandidates.sort((a, b) => a.distance - b.distance);
      const top4EligibleIds = eligibleCandidates.slice(0, 4).map((c) => c.id);

      setEligibleScreens(top4EligibleIds);
    };

    const interval = setInterval(checkPlaybackEligibility, 250);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setEligibleScreens([]);
      } else {
        checkPlaybackEligibility();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screens, modelData, camera, setEligibleScreens]);

  // Collidable meshes for raycasting
  const modelMeshes = useMemo(() => {
    return extractCollidableMeshes(modelData.object);
  }, [modelData.object]);

  // "Place on surface" click listener
  useEffect(() => {
    if (!isPlacingOnSurface || !selectedScreenId) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(modelMeshes, false);

      if (hits.length > 0) {
        const { nativePosition, quaternion } = placeScreenAtHit(hits[0], modelData);
        updateScreen(selectedScreenId, { position: nativePosition, quaternion }, true);
        setPlacingOnSurface(false);
      }
    };

    const domElement = gl.domElement;
    domElement.addEventListener('click', handleClick);

    return () => {
      domElement.removeEventListener('click', handleClick);
    };
  }, [isPlacingOnSurface, selectedScreenId, modelMeshes, modelData, camera, gl, updateScreen, setPlacingOnSurface]);

  return (
    <group name="ScreensRoot">
      {/* All display screens */}
      {screens.map((screen) => (
        <ScreenObject
          key={screen.id}
          screen={screen}
          modelData={modelData}
          isSelected={screen.id === selectedScreenId}
          isEditing={isEditing}
          mode={mode}
          onSelect={() => selectScreen(screen.id)}
        />
      ))}

      {/* TransformControls gizmo on selected screen */}
      {isEditing && selectedScreen && mode === 'orbit' && !isPlacingOnSurface && (
        <ScreenGizmo
          key={selectedScreen.id}
          screen={selectedScreen}
          modelData={modelData}
          gizmoMode={gizmoMode}
          viewerMode={mode}
          onDraggingChange={onGizmoDraggingChange}
        />
      )}
    </group>
  );
};
