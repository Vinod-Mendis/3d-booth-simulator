'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LoadedModelData } from '@/lib/types';

interface ModelRootProps {
  modelData: LoadedModelData;
}

const INTRO_DURATION = 0.9; // seconds
const INTRO_START_SCALE = 0.1;
const INTRO_RISE = 0.12; // metres the model rises while appearing

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface SavedMaterial {
  material: THREE.Material;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
}

function setIntroOpacity(saved: SavedMaterial[], k: number) {
  for (const s of saved) s.material.opacity = s.opacity * k;
}

function restoreMaterials(saved: SavedMaterial[]) {
  for (const s of saved) {
    s.material.transparent = s.transparent;
    s.material.opacity = s.opacity;
    s.material.depthWrite = s.depthWrite;
    s.material.needsUpdate = true;
  }
}

/**
 * ModelRoot positions and scales the loaded model:
 * - Scales the model into meters based on active unit scale factor
 * - Centers it on X and Z
 * - Sits its lowest point on y = 0
 * Plays a short rise-and-fade-in whenever a new model is shown.
 */
export const ModelRoot: React.FC<ModelRootProps> = ({ modelData }) => {
  const { object, nativeBoundingBox, nativeCenter, scaleFactor } = modelData;
  const introRef = useRef<THREE.Group>(null);
  const intro = useRef({ active: false, elapsed: 0, saved: [] as SavedMaterial[] });

  const { position, scale } = useMemo(() => {
    const scaleVec = new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor);
    // Offset so lowest point is y = 0, and horizontal center is at (0, 0)
    const posX = -nativeCenter.x * scaleFactor;
    const posY = -nativeBoundingBox.min.y * scaleFactor;
    const posZ = -nativeCenter.z * scaleFactor;

    return {
      position: [posX, posY, posZ] as [number, number, number],
      scale: [scaleVec.x, scaleVec.y, scaleVec.z] as [number, number, number],
    };
  }, [nativeBoundingBox, nativeCenter, scaleFactor]);

  // Start the intro before first paint so the model never flashes fully visible
  useLayoutEffect(() => {
    const state = intro.current;
    const group = introRef.current;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!group || reduceMotion) return;

    const seen = new Set<THREE.Material>();
    const saved: SavedMaterial[] = [];
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of mats) {
        if (!material || seen.has(material)) continue;
        seen.add(material);
        saved.push({
          material,
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
        });
        material.transparent = true;
        material.depthWrite = false;
        material.opacity = 0;
      }
    });

    state.saved = saved;
    state.elapsed = 0;
    state.active = true;
    group.scale.setScalar(INTRO_START_SCALE);
    group.position.y = -INTRO_RISE;

    return () => {
      // Interrupted (new model / unmount): put materials back exactly as they were
      restoreMaterials(state.saved);
      state.saved = [];
      state.active = false;
      group.scale.setScalar(1);
      group.position.y = 0;
    };
  }, [object]);

  useFrame((_, rawDelta) => {
    const state = intro.current;
    const group = introRef.current;
    if (!state.active || !group) return;

    state.elapsed += Math.min(rawDelta, 0.1);
    const t = Math.min(state.elapsed / INTRO_DURATION, 1);
    const k = easeOutCubic(t);

    group.scale.setScalar(INTRO_START_SCALE + (1 - INTRO_START_SCALE) * k);
    group.position.y = -INTRO_RISE * (1 - k);

    setIntroOpacity(state.saved, k);

    if (t >= 1) {
      restoreMaterials(state.saved);
      state.saved = [];
      state.active = false;
    }
  });

  return (
    // Animated about the floor centre (world origin), outside the model's own transform
    <group ref={introRef}>
      <group position={position} scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
};
