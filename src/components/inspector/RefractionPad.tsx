import { useEffect, useRef } from 'react';
import { setHistoryGesture } from '../../store/iconStore';
import { NumberInput } from '../ui/NumberInput';

export type RefractionChange = { strength?: number; height?: number };
const INSET = 8;
const HEIGHT_TICKS = Array.from({ length: 11 }, (_, i) => i * 10);
const STRENGTH_TICKS = Array.from({ length: 21 }, (_, i) => i * 10 - 100);
const RESET = { strength: 0, height: 50 };
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const along = (f: number) => `calc(${INSET}px + (100% - ${2 * INSET}px) * ${f})`;

export function RefractionPad({ strength, height, dimmed, onChange }: {
  strength: number;
  height: number;
  dimmed: boolean;
  onChange: (change: RefractionChange) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const cleanClicks = useRef(0);
  const down = useRef<[number, number]>([0, 0]);
  const raf = useRef(0);
  const pending = useRef<RefractionChange>({});
  useEffect(() => () => { cancelAnimationFrame(raf.current); if (dragging.current) setHistoryGesture(false); }, []);
  const track = (e: React.PointerEvent) => {
    const r = padRef.current!.getBoundingClientRect();
    pending.current = {
      strength: Math.round(clamp((e.clientX - r.left - INSET) / (r.width - 2 * INSET), 0, 1) * 200 - 100),
      height: Math.round((1 - clamp((e.clientY - r.top - INSET) / (r.height - 2 * INSET), 0, 1)) * 100),
    };
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; onChange(pending.current); if (dragging.current) setHistoryGesture(true); });
  };
  const reset = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    onChange(RESET);
  };
  return <div className="space-y-2 pt-1">
    <div ref={padRef} role="group" aria-roledescription="2D slider" tabIndex={0}
      aria-label={`Refraction strength ${strength} %, height ${height} %`} title="Drag to set strength and height. Double-click or Home resets."
      onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; moved.current = false; down.current = [e.clientX, e.clientY]; track(e); }}
      onPointerMove={e => { if (dragging.current) { if (Math.hypot(e.clientX - down.current[0], e.clientY - down.current[1]) > 3) moved.current = true; if (e.buttons & 1) track(e); else { dragging.current = false; setHistoryGesture(false); } } }}
      onPointerUp={() => { cleanClicks.current = moved.current ? 0 : cleanClicks.current + 1; dragging.current = false; setHistoryGesture(false); }} onPointerCancel={() => { dragging.current = false; setHistoryGesture(false); }}
      onDoubleClick={() => { if (cleanClicks.current >= 2) reset(); }} onKeyDown={e => {
        if (e.key === 'Home') { e.preventDefault(); reset(); return; }
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') { e.preventDefault(); onChange({ strength: clamp(strength - step, -100, 100) }); }
        if (e.key === 'ArrowRight') { e.preventDefault(); onChange({ strength: clamp(strength + step, -100, 100) }); }
        if (e.key === 'ArrowUp') { e.preventDefault(); onChange({ height: clamp(height + step, 0, 100) }); }
        if (e.key === 'ArrowDown') { e.preventDefault(); onChange({ height: clamp(height - step, 0, 100) }); }
      }}
      className={`relative h-28 rounded-[10px] bg-white/[0.05] border border-white/[0.08] cursor-crosshair touch-none select-none ${dimmed ? 'opacity-50' : ''}`}>
      {HEIGHT_TICKS.map(h => <span key={`h${h}`} aria-hidden="true" className={`absolute left-1/2 h-px -translate-x-1/2 -translate-y-1/2 ${h === RESET.height ? 'w-3 bg-white/45' : 'w-1.5 bg-white/20'}`} style={{ top: along(1 - h / 100) }} />)}
      {STRENGTH_TICKS.map(s => <span key={`s${s}`} aria-hidden="true" className={`absolute bottom-0 w-px -translate-x-1/2 ${s === RESET.strength ? 'h-2 bg-white/45' : s % 50 === 0 ? 'h-1.5 bg-white/30' : 'h-1 bg-white/20'}`} style={{ left: along((s + 100) / 200) }} />)}
      <span aria-hidden="true" className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0a84ff] border-2 border-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: along((strength + 100) / 200), top: along(1 - height / 100) }} />
    </div>
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      <span className="text-2xs text-[#a1a1aa]">Strength</span><span className="text-2xs text-[#a1a1aa]">Height</span>
      <NumberInput ariaLabel="Refraction strength" className="min-w-0" value={strength} onChange={v => onChange({ strength: v })} min={-100} max={100} unit="%" />
      <NumberInput ariaLabel="Refraction height" className="min-w-0" value={height} onChange={v => onChange({ height: v })} min={0} max={100} unit="%" />
    </div>
  </div>;
}
