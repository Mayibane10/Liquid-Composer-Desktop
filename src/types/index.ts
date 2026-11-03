export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color'
  | 'luminosity' | 'plus-lighter';

export type AppearanceMode =
  | 'default' | 'dark'
  | 'clear' | 'clearDark'
  | 'tintedLight' | 'tintedDark';

export interface ColorStop {
  offset: number;
  color: string;
}

export type FillConfig =
  | { type: 'none' }
  | { type: 'solid'; color: string }
  | { type: 'gradient'; stops: ColorStop[]; angle: number };

export interface LayerEffects {
  domeIntensity: number;
  domeRadius: number;
  innerRimWidth: number;
  innerRimLitAlpha: number;
  innerRimShadowAlpha: number;
  innerShadowWidth: number;
  innerShadowAlpha: number;
  outerBorderWidth: number;
  outerBorderAlpha: number;
  specularEdge: number;
  rimIntensity: number;
  bottomHighlight: number;
  envReflection: number;
  innerGlow: number;
  ambientRim: number;
  aoDarken: number;
  frostiness: number;
  edgeDarken: number;
  bevel: number;
  refraction: number;
  keyHighlight: number;
  fillHighlight: number;
  darklight: number;
}

export interface LiquidGlassConfig {
  enabled: boolean;
  mode: 'individual' | 'all';
  specular: boolean | 'inside' | 'outside';
  blur: { enabled: boolean; value: number };
  translucency: { enabled: boolean; value: number };
  translucencyGradient?: { enabled: boolean; angle: number; start: number; end: number; startOpacity: number; endOpacity: number };
  dark: { enabled: boolean; value: number };
  mono: { enabled: boolean; value: number };
  shadow: { enabled: boolean; value: number; type?: 'chromatic' | 'neutral' };
  aberration?: number;
  specularIntensity?: number;
  effects?: Partial<LayerEffects>;
  refraction?: { enabled: boolean };
  fresnel?: { enabled: boolean; range: number; factor: number; hardness: number };
  glare?: { enabled: boolean; range: number; convergence: number; factor: number; angle: number };
  tint?: { r: number; g: number; b: number; a: number };
}

export interface LayerLayout {
  x: number;
  y: number;
  scale: number;
}

/** A shared icon can be positioned independently for each Apple platform. */
export type IconPlatform = 'ios' | 'watchos';
export type PlatformLayouts = Partial<Record<IconPlatform, LayerLayout>>;

export interface Layer {
  id: string;
  name: string;
  type: 'layer' | 'group';
  parentId: string | null;
  order: number;
  visible: boolean;
  collapsed?: boolean;
  blobUrl?: string;
  sourceFile?: string;
  opacity: number;
  blendMode: BlendMode;
  fill: FillConfig;
  liquidGlass: LiquidGlassConfig;
  layout: LayerLayout;
  /** Non-destructive position/scale overrides. Missing values inherit `layout`. */
  platformLayouts?: PlatformLayouts;
}

export type BackgroundPreset = 'warm' | 'cool' | 'forest' | 'ocean' | 'sunset' | 'mono';

export interface BackgroundConfig {
  type: 'gradient' | 'solid' | 'image';
  bgType?: 'preset' | 'custom';
  stops?: ColorStop[];
  preset?: BackgroundPreset;
  color?: string;
  colors?: [string, string];
  angle?: number;
  hue?: number;
  tint?: number;
  brightness?: number;
  /** Direction of the background's soft lighting overlay, in degrees. */
  lightAngle?: number;
  /** Strength of the background's soft lighting overlay, from 0 to 100. */
  lightIntensity?: number;
}

export interface AppearanceOverride {
  opacity?: number;
  fill?: FillConfig;
  liquidGlass?: Partial<LiquidGlassConfig>;
  visible?: boolean;
}

export interface IconDocument {
  name: string;
  modified: boolean;
  layers: Layer[];
  background: BackgroundConfig;
  lightAngle: number;
  appearanceMode: AppearanceMode;
  zoom: number;
}

export interface UIState {
  selectedLayerId: string | null;
  expandedGroups: Set<string>;
  inspectorTab: 'brush' | 'document';
  zoom: number;
  lightAngle: number;
  appearanceMode: AppearanceMode;
}

export interface RenderContext {
  layers: Layer[];
  background: BackgroundConfig;
  lightAngle: number;
  appearanceMode: AppearanceMode;
  size: number;
  platform?: IconPlatform;
  appearanceTint?: string;
}
