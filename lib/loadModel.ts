import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { LoadedModelData, UnitType } from './types';
import { computeNativeBounds, detectUnit, getUnitScale } from './units';
import { findScreenMeshes } from './screens';
import { createSampleBooth } from './sampleBooth';

/**
 * Disposes geometries, materials, and textures within an Object3D hierarchy
 * to ensure no WebGL memory leaks when switching models.
 */
export function disposeHierarchy(root: THREE.Object3D): void {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const disposeMaterial = (mat: THREE.Material) => {
        // Dispose textures on material
        const standardMat = mat as unknown as Record<string, unknown>;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'lightMap'].forEach(
          (prop) => {
            const tex = standardMat[prop] as THREE.Texture | undefined;
            if (tex && typeof tex.dispose === 'function') {
              tex.dispose();
            }
          }
        );
        mat.dispose();
      };

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(mesh.material);
        }
      }
    }
  });
}

/**
 * Counts total triangles across all meshes in the hierarchy.
 */
export function countTriangles(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;
      if (geom) {
        if (geom.index) {
          count += geom.index.count / 3;
        } else if (geom.attributes.position) {
          count += geom.attributes.position.count / 3;
        }
      }
    }
  });
  return Math.round(count);
}

/**
 * Sanitizes and preps loaded 3D scene:
 * - Removes lights and cameras (we light the scene ourselves)
 * - Sets every material to DoubleSide
 * - Enables castShadow and receiveShadow on all meshes
 */
export function sanitizeAndPrepModel(root: THREE.Object3D): void {
  const toRemove: THREE.Object3D[] = [];

  root.traverse((child) => {
    // Ignore lights and cameras inside file
    if ((child as THREE.Light).isLight || (child as THREE.Camera).isCamera) {
      toRemove.push(child);
      return;
    }

    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.side = THREE.DoubleSide;
          });
        } else {
          mesh.material.side = THREE.DoubleSide;
        }
      }
    }
  });

  for (const obj of toRemove) {
    obj.removeFromParent();
  }
}

/**
 * Wraps an Object3D into LoadedModelData with bounding box, auto unit detection,
 * triangle count, and detected screens.
 */
export function packageModelData(
  name: string,
  group: THREE.Group,
  isSample = false,
  selectedUnit: UnitType = 'auto'
): LoadedModelData {
  sanitizeAndPrepModel(group);

  const { box: nativeBoundingBox, size: nativeSize, center: nativeCenter } = computeNativeBounds(group);
  const detectedUnit = detectUnit(nativeSize);
  const scaleFactor = getUnitScale(selectedUnit, detectedUnit);

  const scaledSize = nativeSize.clone().multiplyScalar(scaleFactor);
  const scaledBoundingBox = new THREE.Box3(
    nativeBoundingBox.min.clone().multiplyScalar(scaleFactor),
    nativeBoundingBox.max.clone().multiplyScalar(scaleFactor)
  );

  const screens = findScreenMeshes(group);
  const triangleCount = countTriangles(group);

  return {
    id: `${name}_${Date.now()}`,
    name,
    object: group,
    nativeBoundingBox,
    nativeSize,
    nativeCenter,
    detectedUnit,
    selectedUnit,
    scaleFactor,
    scaledBoundingBox,
    scaledSize,
    triangleCount,
    screens,
    isSample,
  };
}

/**
 * Generates the procedural sample booth as LoadedModelData.
 */
export function loadSampleBoothData(): LoadedModelData {
  const sampleGroup = createSampleBooth();
  return packageModelData('Sample Booth', sampleGroup, true, 'm');
}

/**
 * Helper to configure Draco loader instance pointing to /draco/ decoder files.
 */
export function createDracoLoader(): DRACOLoader {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  return dracoLoader;
}

/**
 * Helper to configure GLTF loader with Draco support.
 */
export function createGLTFLoader(manager?: THREE.LoadingManager): GLTFLoader {
  const loader = new GLTFLoader(manager);
  const draco = createDracoLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

/**
 * Loads a .glb file or a .gltf file together with its associated .bin and textures.
 * Uses a LoadingManager URL modifier to map relative file paths to temporary Object URLs,
 * and guarantees all Object URLs are revoked once loading completes or fails.
 */
export async function loadModelFiles(
  files: File[],
  onProgress?: (ratio: number) => void
): Promise<LoadedModelData> {
  if (files.length === 0) {
    throw new Error('No files provided.');
  }

  // 1. Locate primary .glb or .gltf file
  const mainFile = files.find((f) => {
    const lower = f.name.toLowerCase();
    return lower.endsWith('.glb') || lower.endsWith('.gltf');
  });

  if (!mainFile) {
    const ext = files[0].name.split('.').pop() || 'unknown';
    throw new Error(
      `Unsupported format (.${ext}). Please select a .glb file or convert to glTF 2.0 (Blender: File > Export > glTF 2.0).`
    );
  }

  const createdUrls: string[] = [];
  const urlMap = new Map<string, string>();

  try {
    // 2. Build URL mappings for all dropped files
    for (const file of files) {
      const url = URL.createObjectURL(file);
      createdUrls.push(url);
      urlMap.set(file.name, url);
      urlMap.set(file.name.toLowerCase(), url);
    }

    const mainUrl = urlMap.get(mainFile.name) || URL.createObjectURL(mainFile);
    if (!createdUrls.includes(mainUrl)) {
      createdUrls.push(mainUrl);
    }

    // 3. Configure LoadingManager to resolve external .bin and textures
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((requestedUrl) => {
      // Decode and strip relative path notation
      const decoded = decodeURIComponent(requestedUrl);
      const cleanPath = decoded.replace(/^(\.\/|\/)/, '');
      const filename = cleanPath.split(/[\\/]/).pop() || cleanPath;

      const matchedUrl = urlMap.get(filename) || urlMap.get(filename.toLowerCase());
      return matchedUrl || requestedUrl;
    });

    const loader = createGLTFLoader(manager);

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.load(
        mainUrl,
        (result) => resolve(result),
        (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(event.loaded / event.total);
          }
        },
        (err) => reject(err)
      );
    });

    if (!gltf || !gltf.scene) {
      throw new Error('Invalid glTF/GLB file: no root scene found.');
    }

    // 4. Verify the model contains geometry
    let meshCount = 0;
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++;
      }
    });

    if (meshCount === 0) {
      throw new Error('The loaded 3D model contains no geometry or meshes.');
    }

    return packageModelData(mainFile.name, gltf.scene, false, 'auto');
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    if (rawMsg.includes('Unexpected token') || rawMsg.includes('JSON')) {
      throw new Error('Invalid file format: corrupt glTF/GLB structure.');
    }
    throw new Error(rawMsg || 'Failed to load 3D model.');
  } finally {
    // 5. Always revoke object URLs to prevent browser memory leaks
    for (const url of createdUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    }
  }
}
