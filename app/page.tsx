'use client';

import dynamic from 'next/dynamic';

const ViewerApp = dynamic(
  () => import('@/components/viewer/ViewerApp').then((mod) => mod.ViewerApp),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Initializing 3D Viewer...</p>
      </div>
    ),
  }
);

export default function Home() {
  return <ViewerApp />;
}
