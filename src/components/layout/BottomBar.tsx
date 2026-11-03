import { useStore } from '@nanostores/react';
import { $appearanceMode, $tintHue, $tintSaturation, $tintLightness, setAppearanceMode } from '../../store/uiStore';
import type { AppearanceMode } from '../../types/index';

const MODES: { value: AppearanceMode; label: string }[] = [
  { value: 'default', label: 'Default' }, { value: 'dark', label: 'Dark' },
  { value: 'clear', label: 'Clear' }, { value: 'tintedLight', label: 'Tinted' },
];

export function BottomBar() {
  const mode = useStore($appearanceMode);
  const hue = useStore($tintHue), saturation = useStore($tintSaturation), lightness = useStore($tintLightness);
  const clearFamily = mode === 'clear' || mode === 'clearDark';
  const tintedFamily = mode === 'tintedLight' || mode === 'tintedDark';
  const family = clearFamily ? 'clear' : tintedFamily ? 'tinted' : null;
  const setTint = (kind: 'hue' | 'saturation' | 'lightness', value: number) => {
    const v = kind === 'hue' ? Math.max(0, Math.min(360, value)) : Math.max(0, Math.min(100, value));
    if (kind === 'hue') $tintHue.set(v); else if (kind === 'saturation') $tintSaturation.set(v); else $tintLightness.set(v);
  };
  return <div className="appearance-segments" role="group" aria-label="Icon appearance">
    {MODES.map(m => {
      const isFamily = m.value === 'clear' || m.value === 'tintedLight';
      const active = isFamily ? family === (m.value === 'clear' ? 'clear' : 'tinted') : mode === m.value;
      return <button key={m.value} type="button" aria-pressed={active} onClick={() => {
        if (isFamily) setAppearanceMode(m.value === 'clear' ? (clearFamily ? mode : 'clear') : (tintedFamily ? mode : 'tintedLight'));
        else if (!active) setAppearanceMode(m.value);
      }}>{m.label}</button>;
    })}
    {family && <>
      <span className="segment-divider" aria-hidden="true" />
      <button type="button" aria-pressed={family === 'clear' ? mode === 'clear' : mode === 'tintedLight'} onClick={() => setAppearanceMode(family === 'clear' ? 'clear' : 'tintedLight')}>Light</button>
      <button type="button" aria-pressed={family === 'clear' ? mode === 'clearDark' : mode === 'tintedDark'} onClick={() => setAppearanceMode(family === 'clear' ? 'clearDark' : 'tintedDark')}>Dark</button>
    </>}
    {tintedFamily && <div className="tint-controls" aria-label="Tint color sliders">
      <span className="tint-swatch" style={{ background: `hsl(${hue} ${saturation}% ${lightness}%)` }} />
      <label>Hue <input className="tint-slider-hue" aria-label="Tint hue" type="range" min="0" max="360" value={hue} onChange={e => setTint('hue', Number(e.target.value))} /></label>
      <label>Tint <input className="tint-slider-saturation" aria-label="Tint saturation" type="range" min="0" max="100" value={saturation} onChange={e => setTint('saturation', Number(e.target.value))} /></label>
      <label>Brightness <input className="tint-slider-lightness" aria-label="Tint brightness" type="range" min="0" max="100" value={lightness} onChange={e => setTint('lightness', Number(e.target.value))} /></label>
    </div>}
  </div>;
}
