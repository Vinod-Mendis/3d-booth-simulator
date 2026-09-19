'use client';

import React from 'react';

interface EmptyStateProps {
  onOpenFile: () => void;
  onTrySample: () => void;
  isDark: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenFile,
  onTrySample,
  isDark,
}) => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-md w-full rounded-2xl p-8 shadow-2xl backdrop-blur-xl border transition-all duration-200 text-center ${
          isDark
            ? 'bg-slate-900/85 border-slate-800 text-slate-100 shadow-black/60'
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-300/60'
        }`}
      >
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mb-5">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m9-5.25L12 12m0 9V12"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Open a booth or stage in 3D
        </h2>

        {/* Subtitle / Description */}
        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Review event layouts, inspect dimensions, and walkthrough stages directly in your browser. Drag and drop a 3D model anywhere to get started.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onOpenFile}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Choose file
          </button>

          <button
            type="button"
            onClick={onTrySample}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition border flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Try the sample booth
          </button>
        </div>

        {/* Helper conversion tip */}
        <div
          className={`rounded-xl p-3 text-xs leading-relaxed text-left border ${
            isDark
              ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="font-semibold text-sky-500 mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Supported file formats
          </div>
          <p>
            Accepts <code className="px-1 py-0.5 rounded bg-slate-500/10 font-mono text-sky-400">.glb</code> or{' '}
            <code className="px-1 py-0.5 rounded bg-slate-500/10 font-mono text-sky-400">.gltf</code> (along with its <code className="font-mono">.bin</code> and textures).
          </p>
          <p className="mt-1">
            For <strong>FBX</strong>, <strong>OBJ</strong>, or <strong>SketchUp</strong> files, convert to GLB first (in Blender:{' '}
            <span className="italic">File &gt; Export &gt; glTF 2.0</span>).
          </p>
        </div>
      </div>
    </div>
  );
};
