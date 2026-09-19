'use client';

import React, { useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ScreenData, LoadedModelData, ViewerMode } from '@/lib/types';
import { nativeToWorldPos, useScreensStore } from '@/lib/screensStore';
import { VideoSurface } from './VideoSurface';

interface ScreenObjectProps {
  screen: ScreenData;
  modelData: LoadedModelData;
  isSelected: boolean;
  isEditing: boolean;
  mode: ViewerMode;
  onSelect: () => void;
}

/**
 * Creates an unlit placeholder canvas texture showing screen name, size, and aspect.
 */
function createPlaceholderTexture(name: string, width: number, height: number, aspect: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 / (width / height));
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Dark sleek background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const step = 48;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Screen icon & title
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 36);

    // Dimensions
    ctx.font = '600 32px monospace';
    ctx.fillStyle = '#38bdf8';
    const dimText = `${width.toFixed(2)} × ${height.toFixed(2)} m (${aspect})`;
    ctx.fillText(dimText, canvas.width / 2, canvas.height / 2 + 24);

    // Subtitle note
    ctx.font = '400 20px sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.fillText('Custom Display Screen • No Content Assigned', canvas.width / 2, canvas.height / 2 + 76);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const ScreenObject: React.FC<ScreenObjectProps> = ({
  screen,
  modelData,
  isSelected,
  isEditing,
  mode,
  onSelect,
}) => {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // Compute world position from model native space
  const worldPos = useMemo(() => {
    return nativeToWorldPos(screen.position, modelData);
  }, [screen.position, modelData]);

  // World quaternion
  const worldQuat = useMemo(() => {
    return new THREE.Quaternion(...screen.quaternion);
  }, [screen.quaternion]);

  // Placeholder texture
  const placeholderTexture = useMemo(() => {
    return createPlaceholderTexture(screen.name, screen.width, screen.height, screen.aspect);
  }, [screen.name, screen.width, screen.height, screen.aspect]);

  // Track pointer movement between down and up for strict click selection (< 4px)
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit') return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const togglePlayPause = useScreensStore((s) => s.togglePlayPause);

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit' || !pointerDownPos.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    pointerDownPos.current = null;

    // Only select or toggle if pointer moved less than 4 px
    if (dx * dx + dy * dy <= 16) {
      e.stopPropagation();
      if (!isEditing && screen.content.type === 'video') {
        togglePlayPause(screen.id);
      } else {
        onSelect();
      }
    }
  };

  const bezelWidth = screen.width + 0.04;
  const bezelHeight = screen.height + 0.04;
  const bezelDepth = 0.03; // 3 cm deep

  return (
    <group
      position={worldPos}
      quaternion={worldQuat}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      userData={{ screenId: screen.id, isVideoScreen: screen.content.type === 'video' }}
    >
      {/* 1. Back casing and bezel: 3 cm deep, centered at z = -0.015 */}
      <mesh position={[0, 0, -bezelDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[bezelWidth, bezelHeight, bezelDepth]} />
        <meshStandardMaterial
          color={0x090d16}
          roughness={0.4}
          metalness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Display face: Video surface or placeholder canvas */}
      {screen.content.type === 'video' ? (
        <VideoSurface screen={screen} />
      ) : (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[screen.width, screen.height]} />
          <meshBasicMaterial map={placeholderTexture} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Selection outline highlight */}
      {isSelected && isEditing && (
        <group position={[0, 0, 0.002]}>
          {/* Cyan outer border indicator */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(bezelWidth + 0.01, bezelHeight + 0.01, 0.032)]} />
            <lineBasicMaterial color="#38bdf8" linewidth={2} />
          </lineSegments>

          {/* Corner accent glow badges */}
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[screen.width, screen.height]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
