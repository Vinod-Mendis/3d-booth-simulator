'use client';

import React from 'react';
import { ToastMessage } from '@/lib/types';

interface ToasterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  isDark: boolean;
}

export const Toaster: React.FC<ToasterProps> = ({ toasts, onDismiss, isDark }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-slate-700';
        const bgClass = isDark ? 'bg-slate-900/90' : 'bg-white/95';
        let icon = null;

        if (toast.type === 'error') {
          borderClass = 'border-rose-500/40 bg-rose-950/40 text-rose-200';
          icon = (
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        } else if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200';
          icon = (
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          );
        } else if (toast.type === 'loading') {
          borderClass = 'border-sky-500/40 bg-sky-950/40 text-sky-200';
          icon = (
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
          );
        } else {
          borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
          icon = (
            <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-200 text-xs ${bgClass} ${borderClass}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 font-medium leading-relaxed break-words">{toast.message}</div>
            {toast.type !== 'loading' && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded hover:opacity-75 transition cursor-pointer text-slate-400 hover:text-slate-200"
                aria-label="Dismiss alert"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
