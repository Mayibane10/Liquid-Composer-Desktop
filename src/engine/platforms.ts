import type { IconPlatform, Layer, LayerLayout } from '../types/index';

export interface PlatformProfile {
  id: IconPlatform;
  label: string;
  shortLabel: string;
  artboard: string;
  previewClass: string;
}

// The source artboards Apple accepts are square. The preview silhouette and
// safe-area guidance are what differ between destinations.
export const PLATFORM_PROFILES: PlatformProfile[] = [
  { id: 'ios', label: 'iOS + macOS', shortLabel: 'iOS + Mac', artboard: '1024 × 1024', previewClass: 'ios' },
  { id: 'watchos', label: 'Apple Watch', shortLabel: 'Watch', artboard: '1024 × 1024', previewClass: 'watchos' },
];

export const platformProfile = (platform: IconPlatform) =>
  PLATFORM_PROFILES.find((profile) => profile.id === platform) ?? PLATFORM_PROFILES[0];

export function platformLayout(layer: Layer, platform: IconPlatform): LayerLayout {
  const layouts = layer.platformLayouts as Record<string, LayerLayout> | undefined;
  // Read the previous four-platform schema without preserving its obsolete UI.
  const legacy = platform === 'ios' ? (layouts?.iphone ?? layouts?.macos) : undefined;
  return { ...layer.layout, ...legacy, ...layouts?.[platform] };
}

export function layersForPlatform(layers: Layer[], platform: IconPlatform): Layer[] {
  return layers.map((layer) => ({ ...layer, layout: platformLayout(layer, platform) }));
}
