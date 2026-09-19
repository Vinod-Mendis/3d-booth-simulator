import * as THREE from 'three';

export interface CollisionResult {
  newPosition: THREE.Vector3;
  collidedWall: boolean;
  grounded: boolean;
}

const raycaster = new THREE.Raycaster();
const normalMatrix = new THREE.Matrix3();
const tempVec = new THREE.Vector3();
const tempNormal = new THREE.Vector3();

/**
 * Extracts all valid meshes from an Object3D hierarchy for raycasting.
 */
export function extractCollidableMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.visible) {
      meshes.push(child as THREE.Mesh);
    }
  });
  return meshes;
}

/**
 * Tests wall collision and slides along the wall normal if a hit is encountered.
 */
function resolveWallCollision(
  feetPos: THREE.Vector3,
  moveDelta: THREE.Vector3,
  meshes: THREE.Mesh[],
  bodyRadius = 0.35
): { resolvedDelta: THREE.Vector3; hitWall: boolean } {
  const moveLength = moveDelta.length();
  if (moveLength < 0.00001) {
    return { resolvedDelta: moveDelta.clone(), hitWall: false };
  }

  const moveDir = moveDelta.clone().normalize();
  const rayDist = bodyRadius + moveLength;

  const rayHeights = [0.55, 1.2]; // Low and high body checks
  let firstHit: THREE.Intersection | null = null;

  for (const h of rayHeights) {
    const origin = new THREE.Vector3(feetPos.x, feetPos.y + h, feetPos.z);
    raycaster.set(origin, moveDir);
    raycaster.near = 0.01;
    raycaster.far = rayDist;

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      if (!firstHit || hits[0].distance < firstHit.distance) {
        firstHit = hits[0];
      }
    }
  }

  if (!firstHit || !firstHit.face) {
    // No wall hit in intended direction
    return { resolvedDelta: moveDelta.clone(), hitWall: false };
  }

  // Get hit normal in world space
  normalMatrix.getNormalMatrix(firstHit.object.matrixWorld);
  tempNormal.copy(firstHit.face.normal).applyMatrix3(normalMatrix).normalize();

  // Flip normal to face the player if needed
  if (tempNormal.dot(moveDir) > 0) {
    tempNormal.negate();
  }

  // Zero out the Y component for horizontal wall sliding
  tempNormal.y = 0;
  if (tempNormal.lengthSq() < 0.0001) {
    return { resolvedDelta: new THREE.Vector3(0, 0, 0), hitWall: true };
  }
  tempNormal.normalize();

  // Project movement onto the wall plane: move - (move . N) * N
  const dot = moveDelta.dot(tempNormal);
  const slideDelta = moveDelta.clone().sub(tempNormal.clone().multiplyScalar(dot));

  const slideLength = slideDelta.length();
  if (slideLength < 0.00001) {
    return { resolvedDelta: new THREE.Vector3(0, 0, 0), hitWall: true };
  }

  // Check if slide direction also hits another wall
  const slideDir = slideDelta.clone().normalize();
  const slideRayDist = bodyRadius + slideLength;

  let secondaryHit = false;
  for (const h of rayHeights) {
    const origin = new THREE.Vector3(feetPos.x, feetPos.y + h, feetPos.z);
    raycaster.set(origin, slideDir);
    raycaster.near = 0.01;
    raycaster.far = slideRayDist;

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      secondaryHit = true;
      break;
    }
  }

  if (secondaryHit) {
    return { resolvedDelta: new THREE.Vector3(0, 0, 0), hitWall: true };
  }

  return { resolvedDelta: slideDelta, hitWall: true };
}

/**
 * Checks ground height below target feet position.
 * Casts a ray straight down from 0.5m above current feet, max distance 2.0m.
 * Allows climbing steps up to 0.5m (e.g. 0.15m stairs), blocks stage front (0.6m).
 */
function resolveGround(
  targetFeetX: number,
  currentFeetY: number,
  targetFeetZ: number,
  collidables: THREE.Mesh[],
  dt: number,
  maxDistance = 2.0
): { newFeetY: number; grounded: boolean } {
  const origin = new THREE.Vector3(targetFeetX, currentFeetY + 0.5, targetFeetZ);
  const downDir = new THREE.Vector3(0, -1, 0);

  raycaster.set(origin, downDir);
  raycaster.near = 0.01;
  raycaster.far = maxDistance;

  const hits = raycaster.intersectObjects(collidables, false);

  if (hits.length === 0) {
    // No ground within range (edge of a drop) -> block move
    return { newFeetY: currentFeetY, grounded: false };
  }

  const targetHeight = hits[0].point.y;

  // Height smoothing: smooth interpolation up stairs and down steps
  const smoothFactor = Math.min(1.0, 16.0 * dt);
  const smoothedY = currentFeetY + (targetHeight - currentFeetY) * smoothFactor;

  return { newFeetY: smoothedY, grounded: true };
}

/**
 * Main collision and movement solver.
 * Separate module to allow future swapping with three-mesh-bvh.
 */
export function updatePlayerPositionWithCollision(
  currentFeetPos: THREE.Vector3,
  horizontalMoveDelta: THREE.Vector3,
  modelMeshes: THREE.Mesh[],
  groundPlaneMesh: THREE.Mesh | null,
  dt: number,
  bodyRadius = 0.35
): CollisionResult {
  // 1. Wall check & slide
  const { resolvedDelta, hitWall } = resolveWallCollision(
    currentFeetPos,
    horizontalMoveDelta,
    modelMeshes,
    bodyRadius
  );

  const targetX = currentFeetPos.x + resolvedDelta.x;
  const targetZ = currentFeetPos.z + resolvedDelta.z;

  // 2. Ground check against model meshes + ground plane
  const groundCollidables: THREE.Mesh[] = groundPlaneMesh
    ? [...modelMeshes, groundPlaneMesh]
    : [...modelMeshes];

  const { newFeetY, grounded } = resolveGround(
    targetX,
    currentFeetPos.y,
    targetZ,
    groundCollidables,
    dt
  );

  if (!grounded) {
    // Block horizontal move if there's no ground to step on
    return {
      newPosition: currentFeetPos.clone(),
      collidedWall: hitWall,
      grounded: false,
    };
  }

  tempVec.set(targetX, newFeetY, targetZ);

  return {
    newPosition: tempVec.clone(),
    collidedWall: hitWall,
    grounded: true,
  };
}
