import { useStore } from '@nanostores/react';
import { CircleHalf } from '@phosphor-icons/react';
import { $appearanceMode, setAppearanceMode } from '../../store/uiStore';
import type { AppearanceMode } from '../../types/index';

const MODES: { value: AppearanceMode; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'dark',    label: 'Dark'    },
  { value: 'clear',   label: 'Clear'   },
];

export function BottomBar() {
  const mode = useStore($appearanceMode);
  const clear = mode === 'clear' || mode === 'clearDark';

  return (
    <div className="appearance-segments" role="group" aria-label="Icon appearance">
      {MODES.map((m) => {
        const active = m.value === 'clear' ? clear : mode === m.value;
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={active}
            onClick={() => { if (!active) setAppearanceMode(m.value); }}
          >
            {m.label}
          </button>
        );
      })}
      {clear && (
        <>
          <span className="segment-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setAppearanceMode(mode === 'clear' ? 'clearDark' : 'clear')}
            title="Clear style"
            aria-label={`Clear style: ${mode === 'clear' ? 'light' : 'dark'}`}
          >
            <CircleHalf size={12} />
            {mode === 'clear' ? 'Light' : 'Dark'}
          </button>
        </>
      )}
    </div>
  );
}
