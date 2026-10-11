import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover } from './Popover';

// ── Apple system colors, light variant (iOS / macOS 26) ──
const SYSTEM_COLORS = [
  { hex: '#FF383C', label: 'Red' },
  { hex: '#FF8D28', label: 'Orange' },
  { hex: '#FFCC00', label: 'Yellow' },
  { hex: '#34C759', label: 'Green' },
  { hex: '#00C8B3', label: 'Mint' },
  { hex: '#00C3D0', label: 'Teal' },
  { hex: '#00C0E8', label: 'Cyan' },
  { hex: '#0088FF', label: 'Blue' },
  { hex: '#6155F5', label: 'Indigo' },
  { hex: '#CB30E0', label: 'Purple' },
  { hex: '#FF2D55', label: 'Pink' },
  { hex: '#AC7F5E', label: 'Brown' },
  { hex: '#8E8E93', label: 'Gray' },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;
const RECENT_KEY = 'liquid-composer-recent-colors';
const RECENT_LIMIT = 8;

function readRecent(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string' && HEX_RE.test(c)).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function pushRecent(color: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([color, ...readRecent().filter((c) => c !== color)].slice(0, RECENT_LIMIT)));
  } catch {}
}

export function ColorPicker({ value, onChange, label, className = 'color-well', children }: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openedWith = useRef('');
  const draftRef = useRef('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('#000000');
  const [hexText, setHexText] = useState('');
  const [tab, setTab] = useState<'standard' | 'recent'>('standard');
  const [recent, setRecent] = useState<string[]>([]);

  const apply = (hex: string) => {
    const color = hex.toLowerCase();
    draftRef.current = color;
    setDraft(color);
    setHexText(color.slice(1).toUpperCase());
    onChange(color);
  };

  const show = () => {
    const start = HEX_RE.test(value) ? value.toLowerCase() : '#000000';
    openedWith.current = draftRef.current = start;
    setDraft(start);
    setHexText(start.slice(1).toUpperCase());
    setRecent(readRecent());
    setOpen(true);
  };

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (draftRef.current !== openedWith.current) pushRecent(draftRef.current);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) bodyRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
  }, [open]);

  const swatches = tab === 'standard' ? SYSTEM_COLORS : recent.map((hex) => ({ hex, label: hex.toUpperCase() }));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        onClick={() => (open ? close(false) : show())}
        onBlur={(e) => { if (open) e.stopPropagation(); }}
        className={className}
        style={children || !HEX_RE.test(value) ? undefined : { background: value }}
      >
        {children}
      </button>
      {open && (
        <Popover anchor={buttonRef.current} onClose={close} role="dialog" aria-label={label} className="color-popover">
          <div ref={bodyRef}>
            <HexColorPicker color={draft} onChange={apply} />
            <label className="color-hex-field">
              <span aria-hidden="true">#</span>
              <input
                type="text"
                aria-label={`${label} hex`}
                value={hexText}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => {
                  const text = e.target.value.replace('#', '');
                  setHexText(text);
                  if (HEX_RE.test(`#${text}`)) apply(`#${text}`);
                }}
                onBlur={() => setHexText(draft.slice(1).toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') close(true); }}
              />
            </label>
            <div className="glass-segments color-tabs">
              <button type="button" aria-pressed={tab === 'standard'} onClick={() => setTab('standard')}>Standard</button>
              <button type="button" aria-pressed={tab === 'recent'} onClick={() => setTab('recent')}>Recent</button>
            </div>
            <div className="color-swatches" role="group" aria-label={tab === 'standard' ? 'System colors' : 'Recent colors'}>
              {swatches.map(({ hex, label: name }) => (
                <button
                  key={hex}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={hex.toLowerCase() === draft}
                  onClick={() => apply(hex)}
                  className="color-swatch"
                  style={{ background: hex }}
                />
              ))}
              {!swatches.length && <span className="color-swatches-empty">No recent colors</span>}
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
