import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@nanostores/react';
import { ArrowRight, Circle, Diamond, Heart, Hexagon, Magnet, Plus, Rectangle, Shapes, Star, Triangle, UploadSimple } from '@phosphor-icons/react';
import { addLayer } from '../../store/iconStore';
import { $snapEnabled } from '../../store/uiStore';
import symbols8FontUrl from '../../assets/fonts/Symbols-8.ttf?url';

const PAGE_SIZE = 56;
// Symbols-8 cmap contains U+0000..U+0204 and U+E900..U+FFFE.
const SYMBOL_CODEPOINTS = [
  ...Array.from({ length: 0xfffe - 0xe900 + 1 }, (_, index) => 0xe900 + index),
  ...Array.from({ length: 0x205 }, (_, index) => index),
];
const BUILT_IN_SHAPES = [
  { name: 'Rectangle', icon: Rectangle, svg: '<rect x="192" y="192" width="640" height="640" rx="48"/>' },
  { name: 'Circle', icon: Circle, svg: '<circle cx="512" cy="512" r="320"/>' },
  { name: 'Triangle', icon: Triangle, svg: '<path d="M512 160 880 832H144z"/>' },
  { name: 'Square', icon: Rectangle, svg: '<rect x="192" y="192" width="640" height="640"/>' },
  { name: 'Diamond', icon: Diamond, svg: '<path d="M512 112 912 512 512 912 112 512z"/>' },
  { name: 'Hexagon', icon: Hexagon, svg: '<path d="M302 142h420l210 370-210 370H302L92 512z"/>' },
  { name: 'Star', icon: Star, svg: '<path d="m512 90 100 290h305L670 560l95 300-253-182-253 182 95-300L107 380h305z"/>' },
  { name: 'Heart', icon: Heart, svg: '<path d="M512 880 155 531C-5 374 108 120 307 120c92 0 164 51 205 119 41-68 113-119 205-119 199 0 312 254 152 411z"/>' },
  { name: 'Plus', icon: Plus, svg: '<path d="M432 128h160v304h304v160H592v304H432V592H128V432h304z"/>' },
  { name: 'Arrow', icon: ArrowRight, svg: '<path d="M512 120 904 512 512 904 400 792l200-200H120V432h480L400 232z"/>' },
];

export function ShapeLibrary() {
  const snapEnabled = useStore($snapEnabled);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const faceRef = useRef<FontFace | null>(null);
  const urlRef = useRef<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [fontName, setFontName] = useState<string | null>(null);
  const [fontError, setFontError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 12 });

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (faceRef.current) document.fonts.delete(faceRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const installFont = (face: FontFace, objectUrl: string | null, label: string) => {
    if (faceRef.current) document.fonts.delete(faceRef.current);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    document.fonts.add(face);
    faceRef.current = face;
    urlRef.current = objectUrl;
    setFontFamily(face.family);
    setFontName(label);
    setPage(0);
    setSearch('');
    setFontError('');
  };

  const loadFont = async (file: Blob, label = 'Custom symbol font') => {
    let nextUrl: string | null = null;
    setFontError('');
    try {
      const url = nextUrl = URL.createObjectURL(file);
      const face = await new FontFace(`SymbolShapes-${Date.now()}`, `url("${url}")`).load();
      installFont(face, url, label);
    } catch {
      if (nextUrl) URL.revokeObjectURL(nextUrl);
      setFontError('Could not load that font. Choose a valid TTF or OTF symbol font.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    void new FontFace(`SymbolShapes-${Date.now()}`, `url("${symbols8FontUrl}")`).load()
      .then(face => {
        if (cancelled) return;
        installFont(face, null, 'Symbols-8');
      })
      .catch(() => {
        if (!cancelled) setFontError('The bundled Symbols-8 font could not be loaded.');
      });
    return () => { cancelled = true; };
  }, []);

  const matchingGlyphs = SYMBOL_CODEPOINTS
    .filter(codepoint => !search || codepoint.toString(16).includes(search.trim().replace(/^u\+?/i, '').toLowerCase()));
  const pageCount = Math.ceil(matchingGlyphs.length / PAGE_SIZE);
  const visibleGlyphs = matchingGlyphs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const addFontGlyph = (codepoint: number) => {
    if (!fontFamily) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const context = canvas.getContext('2d');
    if (!context) return;
    const character = String.fromCodePoint(codepoint);
    const baseSize = 820;
    context.font = `${baseSize}px "${fontFamily}"`;
    const initial = context.measureText(character);
    const initialWidth = initial.actualBoundingBoxLeft + initial.actualBoundingBoxRight;
    const initialHeight = initial.actualBoundingBoxAscent + initial.actualBoundingBoxDescent;
    if (initialWidth < 1 || initialHeight < 1) {
      setFontError(`This font has no visible glyph at U+${codepoint.toString(16).toUpperCase()}.`);
      return;
    }
    const size = baseSize * Math.min(1, 840 / Math.max(initialWidth, initialHeight));
    context.font = `${size}px "${fontFamily}"`;
    const metrics = context.measureText(character);
    const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    context.fillStyle = 'white';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(character, (1024 - width) / 2 + metrics.actualBoundingBoxLeft, (1024 - height) / 2 + metrics.actualBoundingBoxAscent);
    canvas.toBlob(blob => {
      if (blob) addLayer(URL.createObjectURL(blob), `Symbol U+${codepoint.toString(16).toUpperCase()}.png`, null, 100);
    }, 'image/png');
  };

  return (
    <div className="shape-library-anchor" ref={rootRef}>
      <button
        type="button"
        className="editor-icon-button"
        title="Basic shapes and snapping"
        aria-label="Basic shapes and snapping"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={event => {
          if (!open) {
            const rect = event.currentTarget.getBoundingClientRect();
            const panelWidth = Math.min(360, window.innerWidth - 24);
            setPosition({
              top: rect.bottom + 8,
              left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
            });
          }
          setOpen(value => !value);
        }}>
        <Shapes size={17} />
      </button>
      {open && createPortal(
        <div ref={popoverRef} className="shape-library-popover" style={{ top: position.top, left: position.left }} role="dialog" aria-label="Shape library">
          <div className="shape-library-heading">Shape Library</div>
          <div className="shape-library-builtins" role="group" aria-label="Basic shapes">
            {BUILT_IN_SHAPES.map(({ name, icon: Icon, svg }) => (
              <button key={name} type="button" onClick={() => {
                const image = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g fill="white">${svg}</g></svg>`;
                addLayer(URL.createObjectURL(new Blob([image], { type: 'image/svg+xml' })), `${name.toLowerCase()}.svg`);
              }}>
                <Icon size={18} /> {name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="shape-library-snap"
            aria-pressed={snapEnabled}
            onClick={() => $snapEnabled.set(!snapEnabled)}>
            <Magnet size={16} /> Snap to center <span>{snapEnabled ? 'On' : 'Off'}</span>
          </button>
          <div className="shape-library-font">
            <div className="shape-library-section-title">{fontName ?? 'Symbols-8'}</div>
            <p>{fontName === 'Symbols-8' ? 'All 6,404 mapped characters are available. Search by codepoint or browse the glyph pages.' : 'The selected font stays local; selected glyphs become image layers.'}</p>
            <button type="button" onClick={() => fileRef.current?.click()}>
              <UploadSimple size={16} /> Use another font
            </button>
            <input ref={fileRef} type="file" accept=".ttf,.otf,font/ttf,font/otf" hidden onChange={event => {
              const file = event.target.files?.[0];
              if (file) void loadFont(file, file.name);
              event.currentTarget.value = '';
            }} />
            {fontError && <div className="shape-library-error" role="status">{fontError}</div>}
          </div>
          {fontFamily && <>
            <input className="shape-library-search" type="search" value={search} placeholder="Find by codepoint, e.g. E900" aria-label="Search SF Symbols glyphs" onChange={event => { setSearch(event.target.value); setPage(0); }} />
            <div className="shape-library-grid" aria-label="SF Symbols glyphs">
              {visibleGlyphs.map(codepoint => <button key={codepoint} type="button" style={{ fontFamily }} title={`Add glyph U+${codepoint.toString(16).toUpperCase()}`} aria-label={`Add glyph U+${codepoint.toString(16).toUpperCase()}`} onClick={() => addFontGlyph(codepoint)}>
                {String.fromCodePoint(codepoint)}<span>{codepoint.toString(16).toUpperCase()}</span>
              </button>)}
            </div>
            <div className="shape-library-pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
              <span>{pageCount ? page + 1 : 0} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(value => value + 1)}>Next</button>
            </div>
          </>}
        </div>,
        document.body,
      )}
    </div>
  );
}
