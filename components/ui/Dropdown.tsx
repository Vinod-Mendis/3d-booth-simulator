'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  title?: string;
  className?: string;
}

/** Themed replacement for a native <select>, so the open list matches the rest of the UI. */
export function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  title,
  className = '',
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  const open = () => {
    setHighlight(selectedIndex);
    setIsOpen(true);
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlight((h) => (h + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => (h - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(highlight);
        break;
      case 'Escape':
        // Only close the list; keep Escape from also stopping a tour or leaving presentation mode
        e.preventDefault();
        e.nativeEvent.stopImmediatePropagation();
        e.stopPropagation();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        title={title}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className="h-full w-full flex items-center justify-between gap-1.5 pl-2 pr-1.5 text-[11px] font-mono rounded-[var(--radius-sm)] bg-[var(--bg-app)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition cursor-pointer"
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-full mt-1 z-30 min-w-full py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] shadow-md"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(i)}
                className={`flex items-center justify-between gap-3 px-2 py-1 text-[11px] font-mono cursor-pointer ${
                  highlight === i ? 'bg-[var(--bg-surface-hover)]' : ''
                } ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="w-3 h-3 text-[var(--accent)]" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
