import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CaretUpDown, Check } from '@phosphor-icons/react';
import { Popover } from './Popover';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const TYPEAHEAD_MS = 500;

export function Select({ value, onChange, options, disabled, className = '', ariaLabel }: SelectProps) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((opt) => opt.value === value));

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    close(true);
    if (options[index] && options[index].value !== value) onChange(options[index].value);
  };

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  const findByText = (char: string) => {
    const t = typeahead.current;
    const now = Date.now();
    t.text = now - t.time < TYPEAHEAD_MS ? t.text + char.toLowerCase() : char.toLowerCase();
    t.time = now;
    const repeated = [...t.text].every((c) => c === t.text[0]);
    const query = repeated ? t.text[0] : t.text;
    const start = repeated ? active + 1 : active;
    for (let i = 0; i < options.length; i++) {
      const index = (start + i) % options.length;
      if (options[index].label.toLowerCase().startsWith(query)) return index;
    }
    return -1;
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const typing = Date.now() - typeahead.current.time < TYPEAHEAD_MS;
    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(last, active + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, active - 1);
    else if (e.key === 'Home' || e.key === 'PageUp') next = 0;
    else if (e.key === 'End' || e.key === 'PageDown') next = last;
    else if (e.key === 'Enter' || (e.key === ' ' && !typing)) { e.preventDefault(); choose(active); return; }
    else if (e.key === 'Tab') { e.preventDefault(); close(true); return; }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) next = findByText(e.key);
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          show();
        }}
        onBlur={(e) => { if (open) e.stopPropagation(); }}
        className="editor-select flex w-full items-center justify-between gap-1 text-xs text-left bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-1
          text-[#ebebf5] focus:outline-hidden focus-visible:border-[#0a84ff] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="truncate">{options[selectedIndex]?.label}</span>
        <CaretUpDown size={12} weight="bold" aria-hidden="true" className="editor-chevron shrink-0" />
      </button>
      {open && (
        <Popover anchor={buttonRef.current} onClose={close} matchWidth className="editor-menu editor-listbox">
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${id}-${active}`}
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
          >
            {options.map((opt, i) => (
              <div
                key={opt.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={opt.value === value}
                data-active={i === active}
                className="editor-menu-item"
                onPointerMove={() => { if (i !== active) setActive(i); }}
                onClick={() => choose(i)}
              >
                <Check size={12} weight="bold" aria-hidden="true" className={opt.value === value ? '' : 'invisible'} />
                {opt.label}
              </div>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}
