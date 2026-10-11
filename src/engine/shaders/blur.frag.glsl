#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUV;

uniform sampler2D uTex;
uniform vec2  uTexelSize;   // 1.0 / target size
uniform float uRadius;      // blur radius in texel units
uniform bool  uHorizontal;

out vec4 fragColor;

const int   MAX_TAPS              = 24;   // per side
const float BLUR_SIGMA_PER_RADIUS = 1.0;  // sigma = radius

vec4 fetch(vec2 uv, float lod) {
  return textureLod(uTex, clamp(uv, 0.0005, 0.9995), lod);
}

void main() {
  if (uRadius < 0.5) {
    fragColor = fetch(vUV, 0.0);
    return;
  }
  float sigma  = uRadius * BLUR_SIGMA_PER_RADIUS;
  float span   = ceil(sigma * 3.0);
  float stride = max(1.0, ceil(span / float(MAX_TAPS)));
  int   taps   = int(min(span / stride, float(MAX_TAPS)));
  float lod    = log2(stride);
  float coeff  = -0.5 / (sigma * sigma);
  vec2  dir    = uHorizontal ? vec2(uTexelSize.x, 0.0) : vec2(0.0, uTexelSize.y);

  vec4  sum  = fetch(vUV, lod);
  float wsum = 1.0;
  for (int i = 1; i <= MAX_TAPS; i++) {
    if (i > taps) break;
    float x = float(i) * stride;
    float w = exp(x * x * coeff);
    vec2 off = dir * x;
    sum  += (fetch(vUV + off, lod) + fetch(vUV - off, lod)) * w;
    wsum += 2.0 * w;
  }
  fragColor = sum / wsum;
}
