import { create } from 'zustand';
import type { ViewerMode } from '@/lib/types';

export interface Viewpoint {
  id: string;
  name: string;
  /** Mode the view was saved in; jumping to it switches to this mode */
  mode: ViewerMode;
  /** Camera position in scene (metre) space */
  position: [number, number, number];
  /** Point the camera looks at (orbit target, or a point straight ahead in walk mode) */
  target: [number, number, number];
}

interface ViewpointsState {
  viewpoints: Viewpoint[];
  activeId: string | null;
  /** One-shot request consumed by the active camera controller */
  pending: Viewpoint | null;
  add: (vp: Omit<Viewpoint, 'id'>) => Viewpoint;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Ask the camera to glide to this viewpoint */
  goTo: (vp: Viewpoint) => void;
  consumePending: () => void;
}

export const useViewpointsStore = create<ViewpointsState>((set) => ({
  viewpoints: [],
  activeId: null,
  pending: null,
  add: (vp) => {
    const created: Viewpoint = {
      ...vp,
      id: `vp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    set((s) => ({ viewpoints: [...s.viewpoints, created], activeId: created.id }));
    return created;
  },
  rename: (id, name) =>
    set((s) => ({
      viewpoints: s.viewpoints.map((v) => (v.id === id ? { ...v, name } : v)),
    })),
  remove: (id) =>
    set((s) => ({
      viewpoints: s.viewpoints.filter((v) => v.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),
  clear: () => set({ viewpoints: [], activeId: null, pending: null }),
  goTo: (vp) => set({ pending: vp, activeId: vp.id }),
  consumePending: () => set({ pending: null }),
}));
