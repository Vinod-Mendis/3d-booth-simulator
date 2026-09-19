'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ScreenData } from '@/lib/types';
import { useScreensStore } from '@/lib/screensStore';

interface WebSurfaceProps {
  screen: ScreenData;
}

/**
 * Scale Calibration Formula:
 * drei's <Html transform> applies an internal scale multiplier of (distanceFactor || 10) / 400 = 0.025.
 * This means 1 Three.js meter corresponds to 40 CSS pixels.
 * For an iframe rendered at CSS resolution (pixelWidth x pixelHeight) to physically span
 * exactly (screen.width x screen.height) Three.js meters on the screen face:
 *
 * scaleX = (screen.width * 40) / pixelWidth
 * scaleY = (screen.height * 40) / pixelHeight
 *
 * Applying scale={[scaleX, scaleY, 1]} ensures the iframe covers the physical screen dimensions
 * with 100% precision across any aspect ratio or pixel resolution.
 */
export const WebSurface: React.FC<WebSurfaceProps> = ({ screen }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const webRuntime = useScreensStore((s) => s.webRuntime[screen.id]);
  const setWebRuntime = useScreensStore((s) => s.setWebRuntime);
  const interactiveScreenId = useScreensStore((s) => s.interactiveScreenId);

  const isInteractive = interactiveScreenId === screen.id;
  const isLive = webRuntime?.isLive !== false;
  const reloadCounter = webRuntime?.reloadCounter || 0;

  const rawUrl = screen.content.type === 'url' ? screen.content.url : '';
  const pixelWidth = screen.pixelWidth > 0 ? screen.pixelWidth : 1920;
  const pixelHeight = screen.pixelHeight > 0 ? screen.pixelHeight : 1080;

  // Calibrated scale calculation
  const scaleX = (screen.width * 40) / pixelWidth;
  const scaleY = (screen.height * 40) / pixelHeight;

  // Wireframe calibration outline lines
  const wireframeLine = useMemo(() => {
    const hw = screen.width / 2;
    const hh = screen.height / 2;
    const points = [
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      opacity: 0.3,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.LineLoop(geo, mat);
  }, [screen.width, screen.height]);

  // Client-side same-origin and mixed-content validation computed purely on client
  const clientSecurityError = useMemo(() => {
    if (!rawUrl || typeof window === 'undefined') {
      return null;
    }
    try {
      const parsed = new URL(rawUrl, window.location.href);

      // 1. Protocol check
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'Invalid URL protocol. Use http:// or https://';
      }

      // 2. Same-origin check: allow-scripts + allow-same-origin on same origin defeats sandbox
      if (parsed.origin === window.location.origin) {
        return "Pages from this site can't be embedded here.";
      }

      // 3. Mixed content check: https viewer cannot embed http unless localhost/127.0.0.1
      if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
        const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
        if (!isLocal) {
          return "This page is not secure (http) and can't load here. Use an https link.";
        }
      }

      return null;
    } catch {
      return 'Invalid URL format.';
    }
  }, [rawUrl]);

  // Token representing the current URL and reload iteration
  const currentToken = `${rawUrl}-${reloadCounter}`;
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [timedOutToken, setTimedOutToken] = useState<string | null>(null);

  const isLoaded = loadedToken === currentToken;
  const hasTimedOut = timedOutToken === currentToken && !isLoaded;

  // 10-second embed loading timeout
  useEffect(() => {
    if (!rawUrl || clientSecurityError) return;

    const timer = setTimeout(() => {
      setTimedOutToken(currentToken);
      setWebRuntime(screen.id, { loadTimeout: true });
    }, 10000);

    return () => clearTimeout(timer);
  }, [rawUrl, reloadCounter, clientSecurityError, currentToken, screen.id, setWebRuntime]);

  const handleIframeLoad = () => {
    setLoadedToken(currentToken);
    setWebRuntime(screen.id, { isLoading: false, isLoaded: true, loadTimeout: false });
  };

  // Focus iframe on entering interaction, blur on exit
  useEffect(() => {
    if (isInteractive) {
      // Small timeout to allow DOM to make iframe interactive
      const timer = setTimeout(() => {
        iframeRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      iframeRef.current?.blur();
    }
  }, [isInteractive]);

  return (
    <group position={[0, 0, 0.002]}>
      {/* 1. Wireframe calibration boundary */}
      <primitive object={wireframeLine} />

      {/* 2. drei Html transformed layer */}
      <Html
        transform
        scale={[scaleX, scaleY, 1]}
        pointerEvents="none"
        zIndexRange={[10, 0]}
        style={{
          width: `${pixelWidth}px`,
          height: `${pixelHeight}px`,
          visibility: isLive ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {clientSecurityError ? (
          /* Security / Mixed content error banner */
          <div
            style={{
              width: `${pixelWidth}px`,
              height: `${pixelHeight}px`,
              backgroundColor: '#090d16',
              color: '#f87171',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              fontFamily: 'sans-serif',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fca5a5', margin: '0 0 8px 0' }}>
              Security Restriction
            </h3>
            <p style={{ fontSize: '18px', color: '#f87171', maxWidth: '600px', margin: 0, lineHeight: 1.5 }}>
              {clientSecurityError}
            </p>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: `${pixelWidth}px`,
              height: `${pixelHeight}px`,
              backgroundColor: '#ffffff',
            }}
          >
            {/* The live iframe */}
            <iframe
              ref={iframeRef}
              key={`${rawUrl}-${reloadCounter}`}
              src={rawUrl}
              title={screen.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="fullscreen; autoplay; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleIframeLoad}
              style={{
                width: `${pixelWidth}px`,
                height: `${pixelHeight}px`,
                border: 'none',
                backgroundColor: '#ffffff',
                pointerEvents: isInteractive ? 'auto' : 'none',
                display: 'block',
              }}
            />

            {/* Loading state indicator */}
            {!isLoaded && !hasTimedOut && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#0b0f19',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontFamily: 'sans-serif',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(56, 189, 248, 0.2)',
                    borderTopColor: '#38bdf8',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px',
                  }}
                />
                <p style={{ fontSize: '18px', color: '#e2e8f0', margin: 0, fontWeight: 500 }}>
                  Loading {screen.name}...
                </p>
              </div>
            )}

            {/* Soft Timeout Notice (10s elapsed without onLoad) */}
            {hasTimedOut && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  fontFamily: 'sans-serif',
                  fontSize: '15px',
                  zIndex: 20,
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#f59e0b' }}>⚠️</span>
                  <span>This site may not allow embedding.</span>
                </div>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Open in new tab ↗
                </a>
              </div>
            )}
          </div>
        )}
      </Html>
    </group>
  );
};
