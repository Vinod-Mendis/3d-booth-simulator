'use client';

import dynamic from 'next/dynamic';
import { DotmSquare12 } from '@/components/ui/dotm-square-12';

const ViewerApp = dynamic(
  () => import('@/components/viewer/ViewerApp').then((mod) => mod.ViewerApp),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-dvh flex flex-col items-center justify-center gap-5 bg-[var(--bg-app)] text-[var(--text-primary)]">
        <DotmSquare12 size={48} dotSize={6} speed={1.2} bloom ariaLabel="Initializing 3D viewer" />
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-muted)]">Initializing 3D Viewer...</p>
      </div>
    ),
  }
);

export default function Home() {
  return <ViewerApp />;
}
