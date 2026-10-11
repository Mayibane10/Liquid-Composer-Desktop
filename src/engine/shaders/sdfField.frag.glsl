#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;

const float SDF_FIX  = 16.0;    // matches sdfSeed
const uint  SDF_NONE = 65535u;

uniform usampler2D uSeedTex;    // nearest edge point after jump flooding
uniform sampler2D  uMaskTex;    // seed mask, inside = alpha ≥ 0.5
uniform vec2       uScale;      // x = render px per SDF texel, y = reach (SDF texels)

out vec4 fragField;

float signedDist(ivec2 q) {
  q = clamp(q, ivec2(0), textureSize(uSeedTex, 0) - 1);
  uvec2 s    = texelFetch(uSeedTex, q, 0).rg;
  float side = texelFetch(uMaskTex, q, 0).a >= 0.5 ? 1.0 : -1.0;
  return side * (s.x == SDF_NONE ? uScale.y : min(length(vec2(s) / SDF_FIX - vec2(q) - 0.5), uScale.y));
}

// ── Field: signed distance (render px, + inside) and outward normal from central differences at ±2 texels ──
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec2  g = vec2(signedDist(p + ivec2(2, 0)) - signedDist(p - ivec2(2, 0)), signedDist(p + ivec2(0, 2)) - signedDist(p - ivec2(0, 2)));
  fragField = vec4(signedDist(p) * uScale.x, -g / max(length(g), 1e-4), 0.0);
}
