'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { ScreenData } from '@/lib/types';
import { useScreensStore } from '@/lib/screensStore';
import { getVideoObjectUrl } from '@/lib/videoStore';

interface VideoSurfaceProps {
  screen: ScreenData;
}

/**
 * Creates an informative unlit canvas texture for error or loading states.
 */
function createStatusTexture(
  title: string,
  subtitle: string,
  isError: boolean,
  width: number,
  height: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 / (width / height));
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Dark background
    ctx.fillStyle = isError ? '#1a0505' : '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent header border
    ctx.fillStyle = isError ? '#ef4444' : '#3b82f6';
    ctx.fillRect(0, 0, canvas.width, 8);

    // Icon & Title
    ctx.fillStyle = isError ? '#f87171' : '#60a5fa';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 24);

    // Subtitle
    ctx.fillStyle = isError ? '#fca5a5' : '#94a3b8';
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 28);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({ screen }) => {
  const content = screen.content;
  const setVideoRuntime = useScreensStore((s) => s.setVideoRuntime);
  const runtime = useScreensStore((s) => s.videoRuntime[screen.id]);

  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const fitMode = content.type === 'video' ? content.fit : 'contain';
  const isMuted = content.type === 'video' ? content.muted : true;
  const isLoop = content.type === 'video' ? content.loop : true;

  const videoSource = content.type === 'video' ? content.source : undefined;
  const videoFileId = content.type === 'video' && content.source === 'file' ? content.videoId : undefined;
  const videoUrlSrc = content.type === 'video' && content.source === 'url' ? content.src : undefined;

  // Derived loading state
  const isLoading = !videoTexture && !errorMessage;

  // Compute playback state
  const shouldPlay = runtime?.isPlaying !== false && runtime?.isEligibleForPlayback !== false && (typeof document === 'undefined' || !document.hidden);
  const shouldPlayRef = useRef(shouldPlay);
  const isMutedRef = useRef(isMuted);
  const isLoopRef = useRef(isLoop);

  useEffect(() => {
    shouldPlayRef.current = shouldPlay;
    isMutedRef.current = isMuted;
    isLoopRef.current = isLoop;
  }, [shouldPlay, isMuted, isLoop]);

  // Stable source key: only rebuild HTMLVideoElement when the actual media source changes
  const sourceKey =
    content.type === 'video'
      ? content.source === 'file'
        ? `file:${content.videoId}`
        : `url:${content.src}`
      : 'none';

  // Initialize and load the HTMLVideoElement
  useEffect(() => {
    if (!videoSource) return;

    let isCancelled = false;

    const video = document.createElement('video');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.loop = isLoopRef.current;
    video.muted = isMutedRef.current;
    video.defaultMuted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    videoRef.current = video;

    const handleLoadedMetadata = () => {
      if (isCancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const aspect = video.videoWidth / video.videoHeight;
        setVideoAspect(aspect);
        setVideoRuntime(screen.id, { videoAspect: aspect });
      }
      if (shouldPlayRef.current && video.paused) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    const handleCanPlay = () => {
      if (isCancelled) return;
      setVideoRuntime(screen.id, { isLoading: false, isReady: true });
      if (shouldPlayRef.current && video.paused) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    const handleError = () => {
      if (isCancelled) return;
      let msg = 'Failed to load video.';

      if (video.error) {
        if (video.error.code === MediaError.MEDIA_ERR_DECODE) {
          msg = "This browser can't play this video. Use MP4 (H.264) or WebM.";
        } else if (video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          if (videoSource === 'url') {
            msg = "This video host doesn't allow use in 3D. Upload the file instead.";
          } else {
            msg = "This browser can't play this video. Use MP4 (H.264) or WebM.";
          }
        }
      }

      setErrorMessage(msg);
      setVideoRuntime(screen.id, { isLoading: false, error: msg });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Resolve source (IndexedDB blob or direct URL)
    const setupSource = async () => {
      let sourceUrl: string | null = null;

      if (videoSource === 'file' && videoFileId) {
        sourceUrl = await getVideoObjectUrl(videoFileId);
        if (isCancelled) return;
        if (!sourceUrl) {
          const msg = 'Video file missing, upload it again.';
          setErrorMessage(msg);
          setVideoRuntime(screen.id, { isLoading: false, error: msg });
          return;
        }
        objectUrlRef.current = sourceUrl;
      } else if (videoSource === 'url' && videoUrlSrc) {
        sourceUrl = videoUrlSrc;
      }

      if (!sourceUrl) return;

      video.src = sourceUrl;

      // Create Three.js VideoTexture
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      setVideoTexture(texture);
      video.load();

      // Trigger autoplay immediately upon source setup
      if (shouldPlayRef.current) {
        video.play().catch((err) => {
          console.warn('Initial autoplay rejected, falling back to muted:', err);
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    setupSource();

    return () => {
      isCancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);

      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      videoRef.current = null;

      setVideoTexture((prev) => {
        if (prev) prev.dispose();
        return null;
      });
    };
  }, [sourceKey, screen.id, videoSource, videoFileId, videoUrlSrc, setVideoRuntime]);

  // One-time fallback for browser user gesture policies (retries playback on first click/key)
  useEffect(() => {
    const handleGesture = () => {
      const video = videoRef.current;
      if (video && shouldPlayRef.current && video.paused) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Sync muted property dynamically
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (!isMuted && shouldPlay && video.paused) {
      video.play().catch(() => {});
    }
  }, [isMuted, shouldPlay]);

  // Sync loop property dynamically
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = isLoop;
  }, [isLoop]);

  // Sync playback with runtime state and performance culler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      if (video.paused && video.readyState >= 1) {
        video.play().catch((err) => {
          if (err.name === 'NotAllowedError' && !video.muted) {
            video.muted = true;
            video.play().catch(() => {});
          }
        });
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [shouldPlay]);

  // Apply texture repeat & offset for Cover fit mode via material ref
  useEffect(() => {
    const mat = materialRef.current;
    if (!mat || !mat.map) return;
    const texture = mat.map;

    if (fitMode === 'cover' && videoAspect) {
      const screenAspect = screen.width / screen.height;
      if (videoAspect > screenAspect) {
        // Video is wider than screen: crop horizontal edges
        const repeatX = screenAspect / videoAspect;
        texture.repeat.set(repeatX, 1);
        texture.offset.set((1 - repeatX) / 2, 0);
      } else {
        // Video is taller than screen: crop vertical edges
        const repeatY = videoAspect / screenAspect;
        texture.repeat.set(1, repeatY);
        texture.offset.set(0, (1 - repeatY) / 2);
      }
    } else {
      // Contain mode uses natural UV mapping
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
    }
  }, [videoTexture, fitMode, videoAspect, screen.width, screen.height]);

  // Calculate geometry dimensions for Contain mode
  const screenAspect = screen.width / screen.height;
  let containedWidth = screen.width;
  let containedHeight = screen.height;

  if (fitMode === 'contain' && videoAspect) {
    if (videoAspect > screenAspect) {
      containedWidth = screen.width;
      containedHeight = screen.width / videoAspect;
    } else {
      containedHeight = screen.height;
      containedWidth = screen.height * videoAspect;
    }
  }

  // Generate fallback/status textures
  const statusTexture = useMemo(() => {
    if (errorMessage) {
      return createStatusTexture(
        'Video Error',
        errorMessage,
        true,
        screen.width,
        screen.height
      );
    }
    if (isLoading) {
      return createStatusTexture(
        'Loading Video...',
        content.type === 'video' && content.source === 'file' ? content.fileName : 'Streaming media',
        false,
        screen.width,
        screen.height
      );
    }
    return null;
  }, [errorMessage, isLoading, screen.width, screen.height, content]);

  return (
    <group position={[0, 0, 0.001]} userData={{ screenId: screen.id, isVideoScreen: true }}>
      {/* Matte black letterbox backing plane */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[screen.width, screen.height]} />
        <meshBasicMaterial color="#050505" />
      </mesh>

      {/* Error or Loading banner texture */}
      {statusTexture && (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[screen.width, screen.height]} />
          <meshBasicMaterial map={statusTexture} toneMapped={false} />
        </mesh>
      )}

      {/* Active Video Plane */}
      {!errorMessage && videoTexture && !isLoading && (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry
            args={fitMode === 'contain' ? [containedWidth, containedHeight] : [screen.width, screen.height]}
          />
          <meshBasicMaterial ref={materialRef} map={videoTexture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};
