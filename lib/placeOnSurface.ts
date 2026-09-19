import * as THREE from 'three';
import { LoadedModelData, ViewerMode } from './types';
import { worldToNativePos } from './screensStore';

export interface PlacementResult {
  nativePosition: [number, number, number];
  quaternion: [number, number, number, number];
}

const raycaster = new THREE.Raycaster();
const normalMatrix = new THREE.Matrix3();

/**
 * Computes world orientation quaternion that aligns screen front (+Z) with surface normal
 * and keeps the screen upright (+Y = world Y for near-vertical surfaces).
 */
export function computeOrientationFromNormal(normal: THREE.Vector3): THREE.Quaternion {
  const zAxis = normal.clone().normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);

  let xAxis: THREE.Vector3;
  let yAxis: THREE.Vector3;

  if (Math.abs(zAxis.y) < 0.9) {
    // Near-vertical surface: keep screen upright
    xAxis = new THREE.Vector3().crossVectors(worldUp, zAxis).normalize();
    yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  } else {
    // Near-horizontal surface (floor or ceiling): choose forward reference
    const refForward = new THREE.Vector3(0, 0, -1);
    xAxis = new THREE.Vector3().crossVectors(refForward, zAxis).normalize();
    if (xAxis.lengthSq() < 0.001) {
      xAxis = new THREE.Vector3(1, 0, 0);
    }
    yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  }

  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

/**
 * Computes native coordinates for a raycast hit on a model surface.
 * Snaps 2 cm outward along hit normal.
 */
export function placeScreenAtHit(
  hit: THREE.Intersection,
  modelData: LoadedModelData
): PlacementResult {
  // Extract world space normal
  const normalWorld = new THREE.Vector3(0, 0, 1);
  if (hit.face) {
    normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    normalWorld.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
  }

  // Offset 2 cm along normal
  const worldPos = hit.point.clone().addScaledVector(normalWorld, 0.02);
  const worldQuat = computeOrientationFromNormal(normalWorld);

  const nativePosition = worldToNativePos(worldPos, modelData);
  const quaternion: [number, number, number, number] = [
    Number(worldQuat.x.toFixed(5)),
    Number(worldQuat.y.toFixed(5)),
    Number(worldQuat.z.toFixed(5)),
    Number(worldQuat.w.toFixed(5)),
  ];

  return { nativePosition, quaternion };
}

/**
 * Places a new screen by casting a ray from the center of the viewport against the model.
 * If raycast misses:
 * - Orbit mode: places at orbit target at ~1.5m height, facing camera
 * - Walk mode: places 3m in front of camera, facing camera
 */
export function placeScreenFromView(
  camera: THREE.Camera,
  modelMeshes: THREE.Mesh[],
  modelData: LoadedModelData,
  mode: ViewerMode,
  orbitTarget?: THREE.Vector3
): PlacementResult {
  // Cast ray from center of camera (0, 0 in NDC)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(modelMeshes, false);

  if (hits.length > 0) {
    return placeScreenAtHit(hits[0], modelData);
  }

  // Fallback placement
  let worldPos: THREE.Vector3;
  let worldQuat: THREE.Quaternion;

  if (mode === 'orbit' && orbitTarget) {
    // Place at orbit target at 1.5m height
    worldPos = new THREE.Vector3(orbitTarget.x, 1.5, orbitTarget.z);

    // Face camera
    const toCamera = camera.position.clone().sub(worldPos);
    toCamera.y = 0;
    if (toCamera.lengthSq() < 0.001) toCamera.set(0, 0, 1);
    toCamera.normalize();

    worldQuat = computeOrientationFromNormal(toCamera);
  } else {
    // Walk mode: 3m in front of camera
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);

    worldPos = camera.position.clone().addScaledVector(camDir, 3.0);

    // Face camera (normal pointing back towards camera)
    const toCamera = camDir.clone().negate();
    toCamera.y = 0;
    if (toCamera.lengthSq() < 0.001) toCamera.set(0, 0, 1);
    toCamera.normalize();

    worldQuat = computeOrientationFromNormal(toCamera);
  }

  const nativePosition = worldToNativePos(worldPos, modelData);
  const quaternion: [number, number, number, number] = [
    Number(worldQuat.x.toFixed(5)),
    Number(worldQuat.y.toFixed(5)),
    Number(worldQuat.z.toFixed(5)),
    Number(worldQuat.w.toFixed(5)),
  ];

  return { nativePosition, quaternion };
}
