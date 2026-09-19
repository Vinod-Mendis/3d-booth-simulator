'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { LoadedModelData } from '@/lib/types';

interface ModelRootProps {
  modelData: LoadedModelData;
}

/**
 * ModelRoot positions and scales the loaded model:
 * - Scales the model into meters based on active unit scale factor
 * - Centers it on X and Z
 * - Sits its lowest point on y = 0
 */
export const ModelRoot: React.FC<ModelRootProps> = ({ modelData }) => {
  const { object, nativeBoundingBox, nativeCenter, scaleFactor } = modelData;

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

  return (
    <group position={position} scale={scale}>
      <primitive object={object} />
    </group>
  );
};
