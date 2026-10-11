#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

const float SDF_FIX  = 16.0;    // matches sdfSeed
const uint  SDF_NONE = 65535u;

uniform usampler2D uSeedTex;    // previous pass
uniform int        uStep;       // jump, SDF texels

out uvec4 fragSeed;

// ── Jump flooding: keep the nearest of the 9 seeds at ±step ──
void main() {
  ivec2 p     = ivec2(gl_FragCoord.xy);
  ivec2 n     = textureSize(uSeedTex, 0);
  vec2  pc    = vec2(p) + 0.5;
  uvec2 best  = uvec2(SDF_NONE);
  float bestD = 1e20;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ivec2 q = p + ivec2(x, y) * uStep;
      if (any(lessThan(q, ivec2(0))) || any(greaterThanEqual(q, n))) continue;
      uvec2 s = texelFetch(uSeedTex, q, 0).rg;
      if (s.x == SDF_NONE) continue;
      vec2  v = vec2(s) / SDF_FIX - pc;
      float d = dot(v, v);
      if (d < bestD) { bestD = d; best = s; }
    }
  }
  fragSeed = uvec4(best, 0u, 0u);
}
