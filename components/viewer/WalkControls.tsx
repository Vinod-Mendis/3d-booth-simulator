'use client';

import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LoadedModelData } from '@/lib/types';
import { extractCollidableMeshes, updatePlayerPositionWithCollision } from '@/lib/collision';
import { useScreensStore } from '@/lib/screensStore';

interface WalkControlsProps {
  modelData: LoadedModelData;
  groundMesh: THREE.Mesh | null;
  resetTrigger: number;
}

const MAX_PITCH = (83 * Math.PI) / 180; // 83 degrees in radians (~1.4486)
const WALK_SPEED = 2.2; // 2.2 m/s
const RUN_SPEED = 5.0; // 5.0 m/s
const TURN_SPEED = 2.0; // 2.0 rad/s
const LOOK_SENSITIVITY = 0.0022;

export const WalkControls: React.FC<WalkControlsProps> = ({
  modelData,
  groundMesh,
  resetTrigger,
}) => {
  const { camera, scene, gl } = useThree();

  // Position and orientation state refs
  const feetPos = useRef(new THREE.Vector3(0, 0, 0));
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keysDown = useRef<Set<string>>(new Set());
  const isPointerLocked = useRef(false);
  const isDragging = useRef(false);
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const raycaster = useRef(new THREE.Raycaster());
  const lastRaycastTime = useRef(0);

  // E key listener for video play/pause toggle
  useEffect(() => {
    const handleInteractKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        const activeTag = (document.activeElement as HTMLElement)?.tagName;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) {
          return;
        }
        const focusedId = useScreensStore.getState().focusedVideoScreenId;
        if (focusedId) {
          useScreensStore.getState().togglePlayPause(focusedId);
        }
      }
    };

    window.addEventListener('keydown', handleInteractKey);
    return () => {
      window.removeEventListener('keydown', handleInteractKey);
      useScreensStore.getState().setFocusedVideoScreenId(null);
    };
  }, []);

  // Compute spawn position: 2m in front of model (+Z side) facing -Z
  const calculateSpawn = useRef(() => {
    const depth = modelData.scaledSize.z || 10;
    const spawnZ = depth / 2 + 2.0;
    return new THREE.Vector3(0, 0, spawnZ);
  });

  // Reset to entrance/spawn
  const resetToSpawn = useRef(() => {
    const spawn = calculateSpawn.current();
    feetPos.current.copy(spawn);
    yaw.current = 0; // Facing -Z
    pitch.current = 0;
    camera.position.set(spawn.x, spawn.y + 1.65, spawn.z);
    camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
  });

  // Initialize spawn on mount or when resetTrigger changes
  useEffect(() => {
    resetToSpawn.current();
  }, [resetTrigger, modelData.id, modelData.scaleFactor]);

  // Movement key definitions
  const isKeyActive = (identifiers: string[]): boolean => {
    return identifiers.some((id) => keysDown.current.has(id.toLowerCase()));
  };

  // Keyboard events
  useEffect(() => {
    const MOVEMENT_CODES = new Set([
      'keyw', 'keys', 'keya', 'keyd',
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'shiftleft', 'shiftright',
      'w', 's', 'a', 'd', 'shift',
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing shortcuts if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const codeLower = e.code ? e.code.toLowerCase() : '';
      const keyLower = e.key ? e.key.toLowerCase() : '';

      if (codeLower) keysDown.current.add(codeLower);
      if (keyLower) keysDown.current.add(keyLower);

      // Prevent default browser scrolling on arrow keys and WASD when in Walk mode
      if (MOVEMENT_CODES.has(codeLower) || MOVEMENT_CODES.has(keyLower)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code) keysDown.current.delete(e.code.toLowerCase());
      if (e.key) keysDown.current.delete(e.key.toLowerCase());
    };

    // Clear keys whenever focus is lost or changed
    const handleClearKeys = () => {
      keysDown.current.clear();
      isDragging.current = false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleClearKeys();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleClearKeys);
    window.addEventListener('focus', handleClearKeys);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const activeKeys = keysDown.current;

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleClearKeys);
      window.removeEventListener('focus', handleClearKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activeKeys.clear();
    };
  }, []);

  // Pointer lock & drag-look events
  useEffect(() => {
    const domElement = gl.domElement;

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === domElement;
      keysDown.current.clear();
      isDragging.current = false;
    };

    const handleClick = () => {
      domElement.focus?.();
      if (!isPointerLocked.current) {
        try {
          const promise = domElement.requestPointerLock?.();
          if (promise && typeof (promise as Promise<void>).catch === 'function') {
            (promise as Promise<void>).catch(() => {
              // Fallback to drag-to-look if pointer lock is rejected
            });
          }
        } catch {
          // Fallback to drag-to-look
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLocked.current) {
        yaw.current -= e.movementX * LOOK_SENSITIVITY;
        pitch.current -= e.movementY * LOOK_SENSITIVITY;
        pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current));
      }
    };

    // Drag to look fallback (when not locked, or touch drag)
    const handlePointerDown = (e: PointerEvent) => {
      if (!isPointerLocked.current) {
        isDragging.current = true;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging.current && !isPointerLocked.current) {
        const dx = e.clientX - lastPointerPos.current.x;
        const dy = e.clientY - lastPointerPos.current.y;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };

        yaw.current -= dx * LOOK_SENSITIVITY;
        pitch.current -= dy * LOOK_SENSITIVITY;
        pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current));
      }
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (document.pointerLockElement === domElement) {
        document.exitPointerLock?.();
      }
    };
  }, [gl]);

  // Frame update loop for movement and collision
  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05); // Cap to 50ms to prevent tunneling

    // 1. Handle keyboard rotation (Arrow Left / Arrow Right)
    if (isKeyActive(['ArrowLeft'])) {
      yaw.current += TURN_SPEED * dt;
    }
    if (isKeyActive(['ArrowRight'])) {
      yaw.current -= TURN_SPEED * dt;
    }

    // 2. Compute camera rotation
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // 3. Compute requested movement direction in horizontal plane
    let moveZ = 0; // Forward (-Z) / Backward (+Z)
    let moveX = 0; // Left (-X) / Right (+X)

    if (isKeyActive(['KeyW', 'w', 'ArrowUp'])) moveZ -= 1;
    if (isKeyActive(['KeyS', 's', 'ArrowDown'])) moveZ += 1;
    if (isKeyActive(['KeyA', 'a'])) moveX -= 1;
    if (isKeyActive(['KeyD', 'd'])) moveX += 1;

    const isRunning = isKeyActive(['ShiftLeft', 'ShiftRight', 'Shift']);
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;

    const moveDelta = new THREE.Vector3(0, 0, 0);

    if (moveX !== 0 || moveZ !== 0) {
      // Forward direction: (-sin(yaw), 0, -cos(yaw))
      const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      // Right direction: (cos(yaw), 0, -sin(yaw))
      const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

      const dir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      moveDelta.copy(dir).multiplyScalar(speed * dt);
    }

    // 4. Extract meshes for collision
    const modelMeshes = extractCollidableMeshes(modelData.object);

    // 5. Update position using collision solver
    const { newPosition } = updatePlayerPositionWithCollision(
      feetPos.current,
      moveDelta,
      modelMeshes,
      groundMesh,
      dt,
      0.35 // 0.35m body radius
    );

    feetPos.current.copy(newPosition);

    // 6. Camera sits 1.65m above feet
    camera.position.set(feetPos.current.x, feetPos.current.y + 1.65, feetPos.current.z);

    // 7. Raycast forward from center screen to detect video screens within 6m
    if (state.clock.elapsedTime - lastRaycastTime.current > 0.1) {
      lastRaycastTime.current = state.clock.elapsedTime;
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      let hitScreenId: string | null = null;
      for (const hit of intersects) {
        if (hit.distance > 6.0) break;
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData?.isVideoScreen && obj.userData?.screenId) {
            hitScreenId = obj.userData.screenId as string;
            break;
          }
          obj = obj.parent;
        }
        if (hitScreenId) break;
      }
      if (useScreensStore.getState().focusedVideoScreenId !== hitScreenId) {
        useScreensStore.getState().setFocusedVideoScreenId(hitScreenId);
      }
    }
  });

  return null;
};
