'use client';

import React from 'react';
import { Monitor, Sun, Bookmark } from 'lucide-react';

export type SidebarTab = 'screens' | 'lighting' | 'views';

const TABS: { id: SidebarTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'screens', label: 'Screens', icon: Monitor },
  { id: 'lighting', label: 'Lighting', icon: Sun },
  { id: 'views', label: 'Views', icon: Bookmark },
];

interface SidebarProps {
  isOpen: boolean;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  panels: Record<SidebarTab, React.ReactNode>;
}

/**
 * Docked right sidebar with a tab strip (Photoshop-style). Every panel stays mounted
 * so state such as a running auto-tour survives switching tabs or collapsing the sidebar.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  panels,
}) => (
  <aside
    aria-label="Inspector"
    hidden={!isOpen}
    className="w-[300px] max-md:absolute max-md:right-0 max-md:inset-y-0 max-md:w-[min(300px,88vw)] h-full flex flex-col bg-[var(--bg-surface)] border-l border-[var(--border-default)] text-[var(--text-primary)] select-none shrink-0 z-20 overflow-hidden [&[hidden]]:hidden"
  >
    <div className="h-10 px-1.5 flex items-center border-b border-[var(--border-default)] shrink-0 bg-[var(--bg-surface)]">
      <div role="tablist" aria-label="Inspector panels" className="flex items-center gap-0.5 h-full">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`sidebar-tab-${id}`}
              aria-selected={active}
              aria-controls={`sidebar-panel-${id}`}
              onClick={(e) => {
                onTabChange(id);
                e.currentTarget.blur();
              }}
              className={`relative h-full flex items-center gap-1.5 px-2.5 text-[12px] font-medium transition cursor-pointer ${
                active
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-[var(--accent)]' : ''}`} />
              <span>{label}</span>
              {active && (
                <span className="absolute left-1.5 right-1.5 -bottom-px h-0.5 bg-[var(--accent)] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>

    <div className="flex-1 min-h-0 relative">
      {TABS.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`sidebar-panel-${id}`}
          aria-labelledby={`sidebar-tab-${id}`}
          hidden={activeTab !== id}
          className={`h-full overflow-y-auto ${activeTab !== id ? 'hidden' : ''}`}
        >
          {panels[id]}
        </div>
      ))}
    </div>
  </aside>
);
