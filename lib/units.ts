import * as THREE from 'three';
import { UnitType } from './types';

export const UNIT_FACTORS_TO_METERS: Record<Exclude<UnitType, 'auto'>, number> = {
  m: 1.0,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

export const UNIT_NAMES: Record<Exclude<UnitType, 'auto'>, string> = {
  m: 'Meters',
  cm: 'Centimeters',
  mm: 'Millimeters',
  ft: 'Feet',
  in: 'Inches',
};

/**
 * Computes native bounding box of an object without applying scaling.
 */
export function computeNativeBounds(object: THREE.Object3D): {
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
} {
  // Ensure matrices are updated
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

/**
 * Detects unit based on largest dimension:
 * <= 100 => meters
 * <= 2500 => centimeters
 * otherwise => millimeters
 */
export function detectUnit(nativeSize: THREE.Vector3): Exclude<UnitType, 'auto'> {
  const maxDim = Math.max(nativeSize.x, nativeSize.y, nativeSize.z);
  if (maxDim <= 100) {
    return 'm';
  }
  if (maxDim <= 2500) {
    return 'cm';
  }
  return 'mm';
}

/**
 * Computes scale multiplier required to bring the model to meters.
 */
export function getUnitScale(
  selectedUnit: UnitType,
  detectedUnit: UnitType = 'm'
): number {
  const safeDetected: Exclude<UnitType, 'auto'> = detectedUnit === 'auto' ? 'm' : detectedUnit;
  const activeUnit = selectedUnit === 'auto' ? safeDetected : selectedUnit;
  return UNIT_FACTORS_TO_METERS[activeUnit];
}

/**
 * Formatted display labels for unit dropdown options.
 */
export function getUnitDisplayLabel(
  unit: UnitType,
  detectedUnit: UnitType = 'm'
): string {
  const safeDetected: Exclude<UnitType, 'auto'> = detectedUnit === 'auto' ? 'm' : detectedUnit;
  if (unit === 'auto') {
    return `Auto (${UNIT_NAMES[safeDetected]})`;
  }
  return UNIT_NAMES[unit];
}
