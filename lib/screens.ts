import * as THREE from 'three';
import { ScreenInfo } from './types';

/**
 * Traverses an object to find meshes whose name starts with "SCREEN_" (case-insensitive).
 * Computes world-space width, height, and aspect ratio for Phase 2 screen projection readiness.
 */
export function findScreenMeshes(root: THREE.Object3D): ScreenInfo[] {
  root.updateMatrixWorld(true);
  const screens: ScreenInfo[] = [];

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name.toUpperCase().startsWith('SCREEN_')) {
      const mesh = child as THREE.Mesh;
      
      // Compute bounding box in local/parent transformed orientation
      mesh.geometry.computeBoundingBox();
      const geomBox = mesh.geometry.boundingBox;
      
      let width = 0;
      let height = 0;

      if (geomBox) {
        // Measure geometry dimensions scaled by mesh world scale
        const worldScale = new THREE.Vector3();
        mesh.getWorldScale(worldScale);
        
        const rawW = (geomBox.max.x - geomBox.min.x) * Math.abs(worldScale.x);
        const rawH = (geomBox.max.y - geomBox.min.y) * Math.abs(worldScale.y);
        const rawD = (geomBox.max.z - geomBox.min.z) * Math.abs(worldScale.z);

        // Screen panels are typically flat (one dimension is very small)
        const dims = [rawW, rawH, rawD].sort((a, b) => b - a);
        width = Number(dims[0].toFixed(3));
        height = Number(dims[1].toFixed(3));
      }

      const ratio = height > 0 ? width / height : 1;
      let aspectRatioStr = `${ratio.toFixed(2)}:1`;
      
      // Friendly standard aspect ratios
      if (Math.abs(ratio - 16 / 9) < 0.05) {
        aspectRatioStr = '16:9';
      } else if (Math.abs(ratio - 4 / 3) < 0.05) {
        aspectRatioStr = '4:3';
      } else if (Math.abs(ratio - 21 / 9) < 0.05) {
        aspectRatioStr = '21:9';
      } else if (Math.abs(ratio - 1) < 0.05) {
        aspectRatioStr = '1:1';
      }

      screens.push({
        name: mesh.name,
        width,
        height,
        aspectRatio: aspectRatioStr,
        mesh,
      });
    }
  });

  return screens;
}
