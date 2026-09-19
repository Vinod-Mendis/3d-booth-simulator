'use client';

import React, { useMemo, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { ScreenData, LoadedModelData, ViewerMode } from '@/lib/types';
import { nativeToWorldPos, useScreensStore } from '@/lib/screensStore';
import { VideoSurface } from './VideoSurface';
import { WebSurface } from './WebSurface';

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
    // Neutral dark background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle 1px border
    ctx.strokeStyle = '#38383f';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Screen title
    ctx.font = '600 40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f4f4f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 32);

    // Dimensions
    ctx.font = '500 28px monospace';
    ctx.fillStyle = '#60a5fa';
    const dimText = `${width.toFixed(2)} × ${height.toFixed(2)} m (${aspect})`;
    ctx.fillText(dimText, canvas.width / 2, canvas.height / 2 + 20);

    // Subtitle note
    ctx.font = '400 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#8b8b95';
    ctx.fillText('Custom Display • No Content', canvas.width / 2, canvas.height / 2 + 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a placeholder texture for web screens showing URL and live status.
 */
function createWebPlaceholderTexture(name: string, url: string, isLive: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#38383f';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.font = '600 40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f4f4f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 36);

    ctx.font = '500 22px monospace';
    ctx.fillStyle = '#60a5fa';
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    ctx.fillText(displayUrl || 'No Web URL assigned', canvas.width / 2, canvas.height / 2 + 15);

    if (!isLive) {
      ctx.font = '500 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#8b8b95';
      ctx.fillText('Not live (occluded or > 25m)', canvas.width / 2, canvas.height / 2 + 60);
    }
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
  const lastClickTimeRef = useRef(0);

  // Compute world position from model native space
  const worldPos = useMemo(() => {
    return nativeToWorldPos(screen.position, modelData);
  }, [screen.position, modelData]);

  // World quaternion
  const worldQuat = useMemo(() => {
    return new THREE.Quaternion(...screen.quaternion);
  }, [screen.quaternion]);

  const webRuntime = useScreensStore((s) => s.webRuntime[screen.id]);
  const isLive = webRuntime?.isLive !== false;

  // Placeholder textures
  const placeholderTexture = useMemo(() => {
    return createPlaceholderTexture(screen.name, screen.width, screen.height, screen.aspect);
  }, [screen.name, screen.width, screen.height, screen.aspect]);

  const webPlaceholderTexture = useMemo(() => {
    const url = screen.content.type === 'url' ? screen.content.url : '';
    return createWebPlaceholderTexture(screen.name, url, isLive);
  }, [screen.name, screen.content, isLive]);

  // Track pointer movement between down and up for strict click selection (< 4px)
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit') return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const togglePlayPause = useScreensStore((s) => s.togglePlayPause);
  const setInteractiveScreenId = useScreensStore((s) => s.setInteractiveScreenId);

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit' || !pointerDownPos.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    pointerDownPos.current = null;

    // Only select or toggle if pointer moved less than 4 px
    if (dx * dx + dy * dy <= 16) {
      e.stopPropagation();
      const now = Date.now();
      const isDoubleClick = now - lastClickTimeRef.current < 350;
      lastClickTimeRef.current = now;

      // Double-click in presentation mode to interact with web screen
      if (isDoubleClick && !isEditing && screen.content.type === 'url') {
        setInteractiveScreenId(screen.id);
      } else if (!isEditing && screen.content.type === 'video') {
        togglePlayPause(screen.id);
      } else {
        onSelect();
      }
    }
  };

  const bezelWidth = screen.width + 0.04;
  const bezelHeight = screen.height + 0.04;
  const bezelDepth = 0.03; // 3 cm deep

  // 3D outline points using drei Line (lineWidth 2, worldUnits false)
  const outlinePoints = useMemo<[number, number, number][]>(() => {
    const hw = bezelWidth / 2 + 0.004;
    const hh = bezelHeight / 2 + 0.004;
    const z = 0.003;
    return [
      [-hw, -hh, z],
      [hw, -hh, z],
      [hw, hh, z],
      [-hw, hh, z],
      [-hw, -hh, z],
    ];
  }, [bezelWidth, bezelHeight]);

  return (
    <group
      position={worldPos}
      quaternion={worldQuat}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      userData={{
        screenId: screen.id,
        isVideoScreen: screen.content.type === 'video',
        isWebScreen: screen.content.type === 'url',
      }}
    >
      {/* 1. Back casing and bezel: 3 cm deep, centered at z = -0.015 */}
      <mesh position={[0, 0, -bezelDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[bezelWidth, bezelHeight, bezelDepth]} />
        <meshStandardMaterial
          color={0x18181b}
          roughness={0.6}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Display face: Rendered for none or url (web placeholder); video renders its own sole surface */}
      {screen.content.type !== 'video' && (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[screen.width, screen.height]} />
          <meshBasicMaterial
            map={
              screen.content.type === 'url'
                ? webPlaceholderTexture
                : placeholderTexture
            }
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 3. Dynamic content: Video surface or Web surface */}
      {screen.content.type === 'video' && <VideoSurface screen={screen} />}
      {screen.content.type === 'url' && <WebSurface screen={screen} />}

      {/* 4. Selection outline: 2px line in accent color, no glow */}
      {isSelected && isEditing && (
        <Line
          points={outlinePoints}
          color="#3b82f6"
          lineWidth={2}
          worldUnits={false}
        />
      )}
    </group>
  );
};
