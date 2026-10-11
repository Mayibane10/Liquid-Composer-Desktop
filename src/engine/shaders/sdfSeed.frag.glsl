#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

const float SDF_FIX  = 16.0;    // seed fixed point, SDF texels × 16
const uint  SDF_NONE = 65535u;

uniform sampler2D uMaskTex;     // lighting mask, alpha = silhouette pre-smoothed
uniform float     uSdfSize;     // SDF texels per side

out uvec4 fragSeed;

float alphaAt(ivec2 p) {
  return textureLod(uMaskTex, (vec2(p) + 0.5) / uSdfSize, 0.0).a;
}

// ── Seed: 0.5 isoline crossing next to this texel, subpixel ──
void main() {
  ivec2 p  = ivec2(gl_FragCoord.xy);
  float a  = alphaAt(p);
  float aR = alphaAt(p + ivec2(1, 0));
  float aL = alphaAt(p - ivec2(1, 0));
  float aD = alphaAt(p + ivec2(0, 1));
  float aU = alphaAt(p - ivec2(0, 1));
  bool  inside = a >= 0.5;
  bool  xR = (aR >= 0.5) != inside;
  bool  xL = (aL >= 0.5) != inside;
  bool  xD = (aD >= 0.5) != inside;
  bool  xU = (aU >= 0.5) != inside;
  if (!(xR || xL || xD || xU)) { fragSeed = uvec4(SDF_NONE); return; }

  float gx = xR && (!xL || abs(aR - a) >= abs(a - aL)) ? aR - a : xL ? a - aL : 0.5 * (aR - aL);
  float gy = xD && (!xU || abs(aD - a) >= abs(a - aU)) ? aD - a : xU ? a - aU : 0.5 * (aD - aU);
  vec2  g    = vec2(gx, gy);
  vec2  off  = clamp((0.5 - a) * g / max(dot(g, g), 1e-6), -1.0, 1.0);
  vec2  seed = clamp(vec2(p) + 0.5 + off, 0.0, uSdfSize);
  fragSeed = uvec4(uvec2(seed * SDF_FIX + 0.5), 0u, 0u);
}
