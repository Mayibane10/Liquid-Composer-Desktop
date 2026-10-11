import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 6;
const MARGIN = 8;
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function Popover({ anchor, onClose, matchWidth, className = '', children, onKeyDown, ...rest }: {
  anchor: HTMLElement | null;
  onClose: (refocus: boolean) => void;
  matchWidth?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; minWidth?: number }>({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const minWidth = matchWidth ? a.width : undefined;
    node.style.minWidth = minWidth ? `${minWidth}px` : '';
    const { width, height } = node.getBoundingClientRect();
    const below = a.bottom + GAP;
    setPos({
      minWidth,
      left: Math.max(MARGIN, Math.min(a.left, window.innerWidth - width - MARGIN)),
      top: below + height > window.innerHeight - MARGIN ? Math.max(MARGIN, a.top - GAP - height) : below,
    });
  }, [anchor, matchWidth]);

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      const node = e.target as Node;
      if (!ref.current?.contains(node) && !anchor?.contains(node)) onClose(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
    };
    const handleScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose(false);
    };
    const handleResize = () => onClose(false);
    document.addEventListener('pointerdown', handlePointer, true);
    window.addEventListener('keydown', handleKey, true);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointer, true);
      window.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      {...rest}
      ref={ref}
      className={`editor-popover ${className}`}
      style={{ position: 'fixed', ...pos }}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        e.stopPropagation();
        if (e.key !== 'Tab' || e.defaultPrevented) return;
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]') ?? []);
        const edge = e.shiftKey ? items[0] : items[items.length - 1];
        if (document.activeElement !== edge) return;
        e.preventDefault();
        (e.shiftKey ? items[items.length - 1] : items[0])?.focus();
      }}
      onBlur={(e) => {
        e.stopPropagation();
        const next = e.relatedTarget as Node | null;
        if (next && !ref.current?.contains(next) && !anchor?.contains(next)) onClose(false);
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
