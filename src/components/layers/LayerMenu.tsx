import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type MenuEntry = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  separated?: boolean;
};

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function LayerMenu({ x, y, label, items, anchor, onClose }: {
  x: number;
  y: number;
  label: string;
  items: MenuEntry[];
  anchor?: HTMLElement | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, y + height > window.innerHeight - 8 ? y - height : y),
    });
    menu.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [x, y]);

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const node = e.target as Node;
      if (!ref.current?.contains(node) && !anchor?.contains(node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('pointerdown', handlePointer, true);
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', handlePointer, true);
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [anchor, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.key === 'Tab') { e.preventDefault(); onClose(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const entries = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? entries.length - 1
      : (index + (e.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
    entries[next]?.focus();
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className="editor-popover editor-menu layer-menu"
      style={{ position: 'fixed', left: pos.left, top: pos.top }}
      onKeyDown={handleKeyDown}
      onPointerDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          tabIndex={-1}
          disabled={item.disabled}
          onClick={() => { onClose(); item.onSelect(); }}
          className={`editor-menu-item ${item.separated ? 'editor-menu-separated' : ''} ${item.danger ? 'editor-menu-danger' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
