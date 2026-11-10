'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { LoadedModelData, ViewerMode } from '@/lib/types';
import { ModelRoot } from './ModelRoot';
import { WalkControls } from './WalkControls';
import { ScreensManager } from './screens/ScreensManager';
import { useScreensStore } from '@/lib/screensStore';

type OrbitControlsInstance = React.ComponentRef<typeof OrbitControls>;

interface SceneProps {
  modelData: LoadedModelData | null;
  mode: ViewerMode;
  theme: 'dark' | 'light';
  resetViewTrigger: number;
  onCameraReady?: (camera: THREE.Camera) => void;
  orbitTargetRef?: React.MutableRefObject<THREE.Vector3 | null>;
}

function CameraBridge({
  onCameraReady,
  controlsRef,
  orbitTargetRef,
}: {
  onCameraReady?: (camera: THREE.Camera) => void;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
  orbitTargetRef?: React.MutableRefObject<THREE.Vector3 | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    onCameraReady?.(camera);
  }, [camera, onCameraReady]);

  useEffect(() => {
    if (orbitTargetRef && controlsRef.current) {
      orbitTargetRef.current = controlsRef.current.target;
    }
  });

  return null;
}

/**
 * Handles camera framing when model loads or when user clicks "Reset view".
 */
function CameraController({
  modelData,
  mode,
  resetViewTrigger,
  controlsRef,
}: {
  modelData: LoadedModelData | null;
  mode: ViewerMode;
  resetViewTrigger: number;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const { camera } = useThree();
  const prevModelRef = useRef<LoadedModelData | null>(null);
  const transition = useRef({
    active: false,
    elapsed: 0,
    duration: 1,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    target: new THREE.Vector3(),
    restoreEnabled: true,
  });

  useEffect(() => {
    if (!modelData || mode !== 'orbit') return;

    const height = modelData.scaledSize.y || 4;
    const maxDim = Math.max(modelData.scaledSize.x, modelData.scaledSize.z, height);
    const dist = Math.max(maxDim * 1.5, 6);

    const targetY = Math.min(height * 0.45, 3);
    const camY = Math.max(height * 0.65, 2.8);
    const camZ = dist;

    const tr = transition.current;
    const controls = controlsRef.current;
    tr.toPos.set(0, camY, camZ);
    tr.toTarget.set(0, targetY, 0);

    // Snap on a freshly loaded model; glide when coming from walk mode or resetting the view
    const isNewModel = prevModelRef.current !== modelData;
    prevModelRef.current = modelData;
    const distance = camera.position.distanceTo(tr.toPos);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (isNewModel && !reduceMotion && controls) {
      // New model: push the camera in from further back, in step with the model's fade-in
      const start = tr.toPos.clone().sub(tr.toTarget).multiplyScalar(1.3).add(tr.toTarget);
      camera.position.copy(start);
      camera.lookAt(tr.toTarget);
      controls.target.copy(tr.toTarget);
      controls.update();
      tr.fromPos.copy(start);
      tr.fromTarget.copy(tr.toTarget);
      tr.elapsed = 0;
      tr.duration = 1.2;
      if (!tr.active) tr.restoreEnabled = controls.enabled;
      tr.active = true;
      return;
    }

    if (isNewModel || reduceMotion || distance < 0.01 || !controls) {
      if (tr.active && controls) controls.enabled = tr.restoreEnabled;
      tr.active = false;
      camera.position.copy(tr.toPos);
      camera.lookAt(tr.toTarget);
      if (controls) {
        controls.target.copy(tr.toTarget);
        controls.update();
      }
      return;
    }

    // Start the look-at point straight ahead of the camera so orientation doesn't jump
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    tr.fromTarget
      .copy(camera.position)
      .addScaledVector(forward, Math.max(camera.position.distanceTo(tr.toTarget), 1));
    tr.fromPos.copy(camera.position);
    tr.elapsed = 0;
    tr.duration = THREE.MathUtils.clamp(distance / 12, 0.7, 1.4);
    if (!tr.active) tr.restoreEnabled = controls.enabled;
    tr.active = true;
  }, [modelData, mode, resetViewTrigger, camera, controlsRef]);

  // Runs before OrbitControls' own frame update (subscribed earlier), so disabling it here takes effect this frame
  useFrame((_, rawDelta) => {
    const tr = transition.current;
    if (!tr.active) return;
    const controls = controlsRef.current;
    if (!controls) {
      tr.active = false;
      return;
    }
    controls.enabled = false;

    tr.elapsed += Math.min(rawDelta, 0.1);
    const t = Math.min(tr.elapsed / tr.duration, 1);
    const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic

    camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
    tr.target.lerpVectors(tr.fromTarget, tr.toTarget, k);
    camera.lookAt(tr.target);
    controls.target.copy(tr.target);

    if (t >= 1) {
      tr.active = false;
      controls.enabled = tr.restoreEnabled;
      controls.update();
    }
  });

  return null;
}

/**
 * Configures dynamic lighting with soft shadow camera fitting model bounds.
 */
function Lights({ modelData, isDark }: { modelData: LoadedModelData | null; isDark: boolean }) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (!dirLightRef.current) return;
    const light = dirLightRef.current;

    const span = modelData ? Math.max(modelData.scaledSize.x, modelData.scaledSize.z, modelData.scaledSize.y, 16) : 20;
    const halfSpan = (span / 2) * 1.4;

    light.shadow.camera.left = -halfSpan;
    light.shadow.camera.right = halfSpan;
    light.shadow.camera.top = halfSpan;
    light.shadow.camera.bottom = -halfSpan;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = span * 4;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.bias = -0.0005;
    light.shadow.camera.updateProjectionMatrix();
  }, [modelData]);

  const hemiSky = isDark ? 0xe2e8f0 : 0xffffff;
  const hemiGround = isDark ? 0x1e293b : 0x94a3b8;
  const hemiIntensity = isDark ? 0.75 : 0.95;
  const dirIntensity = isDark ? 1.4 : 1.6;

  const lightY = modelData ? Math.max(modelData.scaledSize.y * 2.2, 12) : 14;
  const lightDist = modelData ? Math.max(modelData.scaledSize.z * 1.5, 12) : 14;

  return (
    <>
      <hemisphereLight
        args={[hemiSky, hemiGround, hemiIntensity]}
        position={[0, 30, 0]}
      />
      <directionalLight
        ref={dirLightRef}
        position={[lightDist * 0.8, lightY, lightDist]}
        intensity={dirIntensity}
        castShadow
      />
    </>
  );
}

/**
 * 3D Scene Viewport Canvas with Ground, Grid, Lights, Model, and Controls.
 */
export const Scene: React.FC<SceneProps> = ({
  modelData,
  mode,
  theme,
  resetViewTrigger,
  onCameraReady,
  orbitTargetRef,
}) => {
  const isDark = theme === 'dark';
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const [groundMesh, setGroundMesh] = useState<THREE.Mesh | null>(null);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);
  // Adaptive resolution: drops render resolution on weak GPUs (e.g. integrated graphics), raises it when there is headroom
  const [dpr, setDpr] = useState(1.25);

  const gridMain = '#2e2e2e';
  const gridSub = '#1a1a1a';

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]"
    >
      <Canvas
        shadows="soft"
        dpr={dpr}
        camera={{ position: [0, 3, 14], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        tabIndex={0}
        style={{ touchAction: 'none' }}
        className={`w-full h-full focus:outline-none ${
          mode === 'walk' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <PerformanceMonitor
          onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, 1.75))}
          onDecline={() => setDpr(1)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />

        <CameraBridge
          onCameraReady={onCameraReady}
          controlsRef={controlsRef}
          orbitTargetRef={orbitTargetRef}
        />

        <CameraController
          modelData={modelData}
          mode={mode}
          resetViewTrigger={resetViewTrigger}
          controlsRef={controlsRef}
        />

        <Lights modelData={modelData} isDark={isDark} />

        {/* Shadow-catcher ground plane at y = -0.002 */}
        <mesh
          ref={setGroundMesh}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.002, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={isDark ? 0.45 : 0.3} />
        </mesh>

        {/* Faint 1-meter grid at y = -0.004 */}
        <gridHelper
          args={[100, 100, gridMain, gridSub]}
          position={[0, -0.004, 0]}
        />

        {/* The loaded model or sample booth */}
        {modelData && <ModelRoot modelData={modelData} />}

        {/* Custom Screens & Transform Gizmos */}
        {modelData && (
          <ScreensManager
            modelData={modelData}
            mode={mode}
            onGizmoDraggingChange={setIsGizmoDragging}
          />
        )}

        {/* Orbit Controls (default) */}
        {mode === 'orbit' && (
          <OrbitControls
            ref={controlsRef}
            enabled={!isGizmoDragging && !interactiveScreenId}
            enableDamping
            dampingFactor={0.06}
            maxPolarAngle={Math.PI / 2 - 0.02} // Cannot go below ground
            minDistance={0.5}
            maxDistance={120}
          />
        )}

        {/* Walk Controls (First-person mode) */}
        {mode === 'walk' && modelData && (
          <WalkControls
            modelData={modelData}
            groundMesh={groundMesh}
            resetTrigger={resetViewTrigger}
          />
        )}
      </Canvas>
    </div>
  );
};
