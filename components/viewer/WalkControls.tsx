'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LoadedModelData } from '@/lib/types';
import { extractCollidableMeshes, updatePlayerPositionWithCollision } from '@/lib/collision';
import { useScreensStore } from '@/lib/screensStore';
import { touchInput } from '@/lib/touchInput';

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
const TOUCH_LOOK_SENSITIVITY = 0.004;

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
  const activePointerId = useRef<number | null>(null);
  const activePointerType = useRef<string>('mouse');
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const raycaster = useRef(new THREE.Raycaster());
  const lastRaycastTime = useRef(0);
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);
  const prevInteractiveRef = useRef<string | null>(null);
  const adoptedMeshNames = useScreensStore((s) => s.adoptedMeshNames);

  // Collision meshes are cached (not re-traversed every frame); rebuilt when adopted/hidden meshes change
  const modelMeshes = useMemo(() => {
    void adoptedMeshNames;
    return extractCollidableMeshes(modelData.object);
  }, [modelData.object, adoptedMeshNames]);
  const groundCollidables = useMemo(
    () => (groundMesh ? [...modelMeshes, groundMesh] : modelMeshes),
    [modelMeshes, groundMesh]
  );

  // Reusable scratch objects for the frame loop
  const scratch = useRef({
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    moveDelta: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    center: new THREE.Vector2(0, 0),
  });

  // E key listener for video play/pause or web screen interaction
  useEffect(() => {
    const handleInteractKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        const activeTag = (document.activeElement as HTMLElement)?.tagName;
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) {
          return;
        }

        const state = useScreensStore.getState();

        // 1. If looking at a web screen: start interacting
        if (state.focusedWebScreenId) {
          e.preventDefault();
          // Release pointer lock
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
          // Stop walk movement
          keysDown.current.clear();
          isDragging.current = false;
          // Set interactive screen
          state.setInteractiveScreenId(state.focusedWebScreenId);
          return;
        }

        // 2. If looking at a video screen: toggle play/pause
        if (state.focusedVideoScreenId) {
          state.togglePlayPause(state.focusedVideoScreenId);
        }
      }
    };

    window.addEventListener('keydown', handleInteractKey);
    return () => {
      window.removeEventListener('keydown', handleInteractKey);
      useScreensStore.getState().setFocusedVideoScreenId(null);
      useScreensStore.getState().setFocusedWebScreenId(null);
    };
  }, []);

  // Re-lock pointer and restore focus when exiting screen interaction
  useEffect(() => {
    if (!interactiveScreenId && prevInteractiveRef.current) {
      keysDown.current.clear();
      isDragging.current = false;
      gl.domElement.focus?.();
      try {
        const promise = gl.domElement.requestPointerLock?.();
        if (promise && typeof (promise as Promise<void>).catch === 'function') {
          (promise as Promise<void>).catch(() => {});
        }
      } catch {}
    }
    prevInteractiveRef.current = interactiveScreenId;
  }, [interactiveScreenId, gl]);

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
      if (useScreensStore.getState().interactiveScreenId) return;

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
      activePointerId.current = null;
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
      // If currently interacting with a screen, clicking canvas exits interaction
      if (useScreensStore.getState().interactiveScreenId) {
        useScreensStore.getState().setInteractiveScreenId(null);
        return;
      }

      domElement.focus?.();
      if (!isPointerLocked.current && activePointerType.current !== 'touch') {
        try {
          const promise = domElement.requestPointerLock?.();
          if (promise && typeof (promise as Promise<void>).catch === 'function') {
            (promise as Promise<void>).catch(() => {});
          }
        } catch {}
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (useScreensStore.getState().interactiveScreenId) return;
      if (isPointerLocked.current) {
        yaw.current -= e.movementX * LOOK_SENSITIVITY;
        pitch.current -= e.movementY * LOOK_SENSITIVITY;
        pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current));
      }
    };

    // Drag to look fallback (when not locked, or touch drag)
    const handlePointerDown = (e: PointerEvent) => {
      if (useScreensStore.getState().interactiveScreenId) return;
      activePointerType.current = e.pointerType;
      if (!isPointerLocked.current && activePointerId.current === null) {
        isDragging.current = true;
        activePointerId.current = e.pointerId;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (useScreensStore.getState().interactiveScreenId) return;
      // Ignore other fingers (e.g. the joystick) so they don't steer the camera
      if (e.pointerId !== activePointerId.current) return;
      if (isDragging.current && !isPointerLocked.current) {
        const sens = e.pointerType === 'touch' ? TOUCH_LOOK_SENSITIVITY : LOOK_SENSITIVITY;
        const dx = e.clientX - lastPointerPos.current.x;
        const dy = e.clientY - lastPointerPos.current.y;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };

        yaw.current -= dx * sens;
        pitch.current -= dy * sens;
        pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      isDragging.current = false;
      activePointerId.current = null;
    };

    domElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    window.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      domElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (document.pointerLockElement === domElement) {
        document.exitPointerLock?.();
      }
    };
  }, [gl]);

  // Frame update loop for movement and collision (priority -1 to run before Drei <Html> transform)
  useFrame((state, rawDelta) => {
    // If interacting with a screen, pause all walk movements and look rotation
    if (interactiveScreenId) {
      return;
    }

    const dt = Math.min(rawDelta, 0.05); // Cap to 50ms to prevent tunneling

    // 1. Handle keyboard rotation (Arrow Left / Arrow Right)
    if (isKeyActive(['ArrowLeft'])) {
      yaw.current += TURN_SPEED * dt;
    }
    if (isKeyActive(['ArrowRight'])) {
      yaw.current -= TURN_SPEED * dt;
    }

    // 2. Compute camera rotation
    const sc = scratch.current;
    sc.euler.set(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(sc.euler);

    // 3. Compute requested movement direction in horizontal plane
    let moveZ = 0; // Forward (-Z) / Backward (+Z)
    let moveX = 0; // Left (-X) / Right (+X)

    if (isKeyActive(['KeyW', 'w', 'ArrowUp'])) moveZ -= 1;
    if (isKeyActive(['KeyS', 's', 'ArrowDown'])) moveZ += 1;
    if (isKeyActive(['KeyA', 'a'])) moveX -= 1;
    if (isKeyActive(['KeyD', 'd'])) moveX += 1;

    // Touch joystick adds an analog axis (clamped so keyboard + joystick can't exceed 1)
    moveX = Math.max(-1, Math.min(1, moveX + touchInput.moveX));
    moveZ = Math.max(-1, Math.min(1, moveZ - touchInput.moveY));

    const isRunning = touchInput.run || isKeyActive(['ShiftLeft', 'ShiftRight', 'Shift']);
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;

    const moveDelta = sc.moveDelta.set(0, 0, 0);

    if (moveX !== 0 || moveZ !== 0) {
      // Forward direction: (-sin(yaw), 0, -cos(yaw))
      const forward = sc.forward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      // Right direction: (cos(yaw), 0, -sin(yaw))
      const right = sc.right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));

      const dir = sc.dir
        .set(0, 0, 0)
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      const magnitude = Math.min(1, Math.hypot(moveX, moveZ));
      moveDelta.copy(dir).multiplyScalar(speed * dt * magnitude);
    }

    // 5. Update position using collision solver
    const { newPosition } = updatePlayerPositionWithCollision(
      feetPos.current,
      moveDelta,
      modelMeshes,
      groundMesh,
      dt,
      0.35, // 0.35m body radius
      groundCollidables
    );

    feetPos.current.copy(newPosition);

    // 6. Camera sits 1.65m above feet
    camera.position.set(feetPos.current.x, feetPos.current.y + 1.65, feetPos.current.z);
    // Explicitly update camera matrix world synchronously so Drei <Html> reads the current frame
    camera.updateMatrixWorld(true);

    // 7. Raycast forward from center screen to detect video or web screens within 6m
    if (state.clock.elapsedTime - lastRaycastTime.current > 0.1) {
      lastRaycastTime.current = state.clock.elapsedTime;
      raycaster.current.far = 6.0;
      raycaster.current.setFromCamera(sc.center, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      let hitVideoId: string | null = null;
      let hitWebId: string | null = null;

      for (const hit of intersects) {
        if (hit.distance > 6.0) break;
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData?.screenId) {
            if (obj.userData?.isWebScreen) {
              hitWebId = obj.userData.screenId as string;
            } else if (obj.userData?.isVideoScreen) {
              hitVideoId = obj.userData.screenId as string;
            }
            break;
          }
          obj = obj.parent;
        }
        if (hitVideoId || hitWebId) break;
      }

      const store = useScreensStore.getState();
      if (store.focusedVideoScreenId !== hitVideoId) {
        store.setFocusedVideoScreenId(hitVideoId);
      }
      if (store.focusedWebScreenId !== hitWebId) {
        store.setFocusedWebScreenId(hitWebId);
      }
    }
  }, -1);

  return null;
};
