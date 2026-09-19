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
  const { camera, gl, scene } = useThree();

  const screens = useScreensStore((s) => s.screens);
  const selectedScreenId = useScreensStore((s) => s.selectedScreenId);
  const isEditing = useScreensStore((s) => s.isEditing);
  const gizmoMode = useScreensStore((s) => s.gizmoMode);
  const isPlacingOnSurface = useScreensStore((s) => s.isPlacingOnSurface);
  const selectScreen = useScreensStore((s) => s.selectScreen);
  const updateScreen = useScreensStore((s) => s.updateScreen);
  const setPlacingOnSurface = useScreensStore((s) => s.setPlacingOnSurface);
  const setEligibleScreens = useScreensStore((s) => s.setEligibleScreens);
  const setLiveWebScreens = useScreensStore((s) => s.setLiveWebScreens);
  const adoptedMeshNames = useScreensStore((s) => s.adoptedMeshNames);
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);

  const selectedScreen = useMemo(() => {
    return screens.find((s) => s.id === selectedScreenId) || null;
  }, [screens, selectedScreenId]);

  // Collidable meshes for placement
  const modelMeshes = useMemo(() => {
    return extractCollidableMeshes(modelData.object);
  }, [modelData.object]);

  // Occluder meshes: exclude adopted (hidden) SCREEN_* meshes since raycasts ignore Three.js visibility
  const occluderMeshes = useMemo(() => {
    return modelMeshes.filter(
      (m) => !adoptedMeshNames.includes(m.name) && !m.name.startsWith('SCREEN_')
    );
  }, [modelMeshes, adoptedMeshNames]);

  // Performance Coordinator: Check every 250ms for videos and live web screens
  useEffect(() => {
    const projScreenMatrix = new THREE.Matrix4();
    const frustum = new THREE.Frustum();
    const raycaster = new THREE.Raycaster();
    let lastLiveWebIds: string[] = [];
    let lastEligibleVideoIds: string[] = [];

    const shallowEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((val, index) => val === b[index]);

    const checkCoordinator = () => {
      if (document.hidden) {
        if (lastEligibleVideoIds.length > 0) {
          lastEligibleVideoIds = [];
          setEligibleScreens([]);
        }
        if (lastLiveWebIds.length > 0) {
          lastLiveWebIds = [];
          setLiveWebScreens([]);
        }
        return;
      }

      camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);

      // --- 1. Video Screens Coordinator (max 4 playing) ---
      const videoScreens = screens.filter((s) => s.content.type === 'video');
      const eligibleVideoCandidates: { id: string; distance: number }[] = [];

      for (const screen of videoScreens) {
        const worldPos = nativeToWorldPos(screen.position, modelData);
        const dist = camera.position.distanceTo(worldPos);

        if (dist <= 25) {
          const radius = Math.max(screen.width, screen.height) * 0.75 + 1.5;
          const sphere = new THREE.Sphere(worldPos, radius);
          const inFrustum = frustum.intersectsSphere(sphere);
          const toScreen = worldPos.clone().sub(camera.position).normalize();
          const isFacing = toScreen.dot(forward) > -0.3;

          if (inFrustum || isFacing) {
            eligibleVideoCandidates.push({ id: screen.id, distance: dist });
          }
        }
      }

      eligibleVideoCandidates.sort((a, b) => a.distance - b.distance);
      const top4VideoIds = eligibleVideoCandidates.slice(0, 4).map((c) => c.id);
      if (!shallowEqual(lastEligibleVideoIds, top4VideoIds)) {
        lastEligibleVideoIds = top4VideoIds;
        setEligibleScreens(top4VideoIds);
      }

      // --- 2. Web Screens Coordinator (max 3 live, with 5-point occlusion raycasting) ---
      const webScreens = screens.filter((s) => s.content.type === 'url');
      const eligibleWebCandidates: { id: string; distance: number }[] = [];

      for (const screen of webScreens) {
        const worldPos = nativeToWorldPos(screen.position, modelData);
        const dist = camera.position.distanceTo(worldPos);

        // Max distance 25 meters
        if (dist > 25) continue;

        // Behind camera check
        const toScreen = worldPos.clone().sub(camera.position).normalize();
        if (toScreen.dot(forward) < -0.2) continue;

        // Back-side facing check: screen normal points along local +Z
        const worldQuat = new THREE.Quaternion(...screen.quaternion);
        const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();
        const toCamFromScreen = camera.position.clone().sub(worldPos).normalize();
        if (screenNormal.dot(toCamFromScreen) <= 0) continue; // Looking at back side

        // 9-point Raycast Occlusion test against occluderMeshes
        // Tests center, bottom edge (critical for reception counters/desks), corners, and midpoints
        const hw = screen.width * 0.48;
        const hh = screen.height * 0.48;
        const testPoints = [
          new THREE.Vector3(0, 0, 0),         // center
          new THREE.Vector3(0, -hh, 0),        // bottom-center (where counters occlude)
          new THREE.Vector3(-hw, -hh, 0),      // bottom-left
          new THREE.Vector3(hw, -hh, 0),       // bottom-right
          new THREE.Vector3(-hw, 0, 0),        // mid-left
          new THREE.Vector3(hw, 0, 0),         // mid-right
          new THREE.Vector3(-hw, hh, 0),       // top-left
          new THREE.Vector3(0, hh, 0),         // top-center
          new THREE.Vector3(hw, hh, 0),        // top-right
        ];

        let blockedCount = 0;
        let centerBlocked = false;

        for (let i = 0; i < testPoints.length; i++) {
          const localPt = testPoints[i];
          const ptWorld = localPt.clone().applyQuaternion(worldQuat).add(worldPos);
          const dir = ptWorld.clone().sub(camera.position);
          const distToPt = dir.length();
          dir.normalize();

          raycaster.set(camera.position, dir);
          const hits = raycaster.intersectObjects(occluderMeshes, false);
          // Blocked only if hit.distance < distanceToTargetPoint - 0.05
          if (hits.length > 0 && hits[0].distance < distToPt - 0.05) {
            blockedCount++;
            if (i === 0) {
              centerBlocked = true;
            }
          }
        }

        // Occluded if center is blocked OR any test point is blocked by foreground geometry (e.g. counter, pillar, walls)
        const isInteractive = interactiveScreenId === screen.id;
        if (!isInteractive && (centerBlocked || blockedCount >= 1)) {
          continue;
        }

        eligibleWebCandidates.push({ id: screen.id, distance: dist });
      }

      // Sort by distance: nearest 3 are live iframes
      eligibleWebCandidates.sort((a, b) => a.distance - b.distance);
      const top3WebIds = eligibleWebCandidates.slice(0, 3).map((c) => c.id);

      if (!shallowEqual(lastLiveWebIds, top3WebIds)) {
        lastLiveWebIds = top3WebIds;
        setLiveWebScreens(top3WebIds);
      }
    };

    const interval = setInterval(checkCoordinator, 250);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setEligibleScreens([]);
        setLiveWebScreens([]);
      } else {
        checkCoordinator();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screens, modelData, camera, scene, occluderMeshes, interactiveScreenId, setEligibleScreens, setLiveWebScreens]);

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
