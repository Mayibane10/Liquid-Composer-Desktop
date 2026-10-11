import { atom, batch, effect } from 'nanostores';
import { $layers, $background, $iconName, bgColorsFromHueTint } from './iconStore';
import { $appearanceMode, $zoom, setAppearanceMode, setZoom, $persistenceEnabled } from './uiStore';
import type { Layer, LayerEffects, BackgroundConfig, AppearanceMode } from '../types/index';

const STORAGE_KEY = 'liquid-composer-state';
const ASSET_DB_NAME = 'liquid-composer-assets';
const ASSET_STORE_NAME = 'images';
const CURRENT_VERSION = 1;
const APPEARANCE_MODES: AppearanceMode[] = ['default', 'dark', 'clear', 'clearDark'];

export const $hasUnsavedChanges = atom<boolean>(false);

interface StoredAppData {
  version: number;
  data: {
    iconName: string;
    layers: Layer[];
    background: BackgroundConfig;
    ui: {
      appearanceMode: AppearanceMode;
      zoom: number;
    }
  }
}

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(ASSET_DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(ASSET_STORE_NAME);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function setAsset(id: string, blob: Blob) {
  const db = await dbPromise;
  return new Promise((r, rej) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    tx.objectStore(ASSET_STORE_NAME).put(blob, id);
    tx.oncomplete = r;
    tx.onerror = rej;
  });
}

async function getAsset(id: string): Promise<Blob | null> {
  const db = await dbPromise;
  return new Promise((r) => {
    const tx = db.transaction(ASSET_STORE_NAME, 'readonly');
    const req = tx.objectStore(ASSET_STORE_NAME).get(id);
    req.onsuccess = () => r(req.result);
    req.onerror = () => r(null);
  });
}

async function removeAsset(id: string) {
    const db = await dbPromise;
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    tx.objectStore(ASSET_STORE_NAME).delete(id);
}

async function saveState() {
  if (!$persistenceEnabled.get()) return;

  const layers = $layers.get();
  
  const state: StoredAppData = {
    version: CURRENT_VERSION,
    data: {
      iconName: $iconName.get(),
      layers: layers.map(l => ({
        ...l,
        blobUrl: undefined, // Don't persist temporary URLs
      })),
      background: $background.get(),
      ui: {
        appearanceMode: $appearanceMode.get(),
        zoom: $zoom.get(),
      }
    }
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $hasUnsavedChanges.set(false);
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export async function initPersistence() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const persisted = JSON.parse(raw) as StoredAppData;
      
      if (persisted.version === CURRENT_VERSION || persisted.version === 2 || persisted.version === 3) {
        const { data } = persisted;

        if (persisted.version > CURRENT_VERSION && data.layers) {
          data.layers = data.layers.map((layer) => {
            const { lighting, ...glass } = layer.liquidGlass as Layer['liquidGlass'] & { lighting?: string };
            const { splay, ...effects } = (glass.effects ?? {}) as Partial<LayerEffects> & { splay?: number };
            if (persisted.version === 3) {
              const depth = effects.bevel ?? 7;
              effects.innerRimWidth = Number(((effects.innerRimWidth ?? 30) * depth / 100).toFixed(4));
              effects.innerShadowWidth = Number(((effects.innerShadowWidth ?? 34.3) * depth / 100).toFixed(4));
              effects.outerBorderWidth = Number(((effects.outerBorderWidth ?? 2.3) * depth / 100).toFixed(4));
            }
            return {
              ...layer,
              liquidGlass: {
                ...glass,
                effects: Object.keys(effects).length ? effects : undefined,
              },
            };
          });
        }
        
        // Restore Layer Assets from IDB
        const layersWithBlobs = await Promise.all((data.layers || []).map(async (l) => {
            if (l.type === 'layer') {
                const blob = await getAsset(l.id).catch(() => null);
                if (blob) {
                    return { ...l, blobUrl: URL.createObjectURL(blob) };
                }
            }
            return l;
        }));

        batch(() => {
          if (data.iconName) $iconName.set(data.iconName);
          if (data.layers) $layers.set(layersWithBlobs as Layer[]);
          if (data.background) $background.set(data.background);
          if (data.ui) {
            if (APPEARANCE_MODES.includes(data.ui.appearanceMode)) setAppearanceMode(data.ui.appearanceMode);
            if (data.ui.zoom !== undefined) setZoom(data.ui.zoom);
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse persisted state:', e);
    }
  }

  // Auto-save listeners (metadata only)
  let timeout: number | null = null;
  const debouncedSave = () => {
    $hasUnsavedChanges.set(true);
    if (timeout) window.clearTimeout(timeout);
    timeout = window.setTimeout(saveState, 3000);
  };

  // Prevent data loss on accidental close
  window.addEventListener('beforeunload', (e) => {
    if ($hasUnsavedChanges.get() && $persistenceEnabled.get()) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    }
  });

  const persistedAssetIds = new Set<string>(
    $layers.get().filter(l => l.blobUrl).map(l => l.id)
  );

  // Sync blob assets to/from IDB whenever layers change
  $layers.listen(async (layers) => {
    if (!$persistenceEnabled.get()) return;
    // Save new blob assets
    for (const l of layers) {
      if (l.blobUrl && !persistedAssetIds.has(l.id)) {
        persistedAssetIds.add(l.id);
        try {
          const resp = await fetch(l.blobUrl);
          const blob = await resp.blob();
          await setAsset(l.id, blob);
        } catch {}
      }
    }
    // Remove IDB entries for deleted layers
    const currentIds = new Set(layers.map(l => l.id));
    for (const id of [...persistedAssetIds]) {
      if (!currentIds.has(id)) {
        persistedAssetIds.delete(id);
        removeAsset(id).catch(() => {});
      }
    }
  });

  let initialRun = true;
  effect([$layers, $background, $iconName, $appearanceMode, $zoom, $persistenceEnabled], () => {
    if (initialRun) { initialRun = false; return; }
    debouncedSave();
  });
}

export async function persistLayerAsset(id: string, blob: Blob) {
    await setAsset(id, blob);
    saveState();
}

export async function deleteLayerAsset(id: string) {
    await removeAsset(id);
    saveState();
}

export async function clearPersistence() {
    $hasUnsavedChanges.set(false);
    $persistenceEnabled.set(false);
    localStorage.removeItem(STORAGE_KEY);
    try {
        const db = await dbPromise;
        const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
        tx.objectStore(ASSET_STORE_NAME).clear();
        await new Promise((resolve) => { tx.oncomplete = tx.onerror = tx.onabort = resolve; });
    } finally {
        window.location.reload();
    }
}
