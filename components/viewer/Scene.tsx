'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LoadedModelData, ViewerMode } from '@/lib/types';
import { ModelRoot } from './ModelRoot';
import { WalkControls } from './WalkControls';
import { ScreensManager } from './screens/ScreensManager';

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

  useEffect(() => {
    if (!modelData || mode !== 'orbit') return;

    const height = modelData.scaledSize.y || 4;
    const maxDim = Math.max(modelData.scaledSize.x, modelData.scaledSize.z, height);
    const dist = Math.max(maxDim * 1.5, 6);

    const targetY = Math.min(height * 0.45, 3);
    const camY = Math.max(height * 0.65, 2.8);
    const camZ = dist;

    camera.position.set(0, camY, camZ);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(0, targetY, 0);
      controlsRef.current.update();
    }
  }, [modelData, mode, resetViewTrigger, camera, controlsRef]);

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
  const controlsRef = useRef<OrbitControlsInstance | null>(null);
  const [groundMesh, setGroundMesh] = useState<THREE.Mesh | null>(null);
  const [isGizmoDragging, setIsGizmoDragging] = useState(false);

  const gridMain = isDark ? '#334155' : '#cbd5e1';
  const gridSub = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-radial from-slate-900 via-slate-950 to-black text-slate-100'
          : 'bg-radial from-slate-100 via-slate-200 to-slate-300 text-slate-900'
      }`}
    >
      <Canvas
        shadows="soft"
        camera={{ position: [0, 3, 14], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        tabIndex={0}
        className={`w-full h-full focus:outline-none ${
          mode === 'walk' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
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
            enabled={!isGizmoDragging}
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
