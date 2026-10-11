import { CHICLET_CORNER_RADIUS } from './glassContract';

// ── Continuous corner: circular arc between two cubics, curve starts 1.52866·r from the corner ──
const CORNER = (() => {
  const s = 0.52866;
  const beta = (Math.PI / 4) * s;
  const arcLen = Math.sin((Math.PI / 4) * (1 - s)) * Math.SQRT2;
  const c = Math.tan(beta / 2) * Math.cos(beta);
  const d = c * Math.tan(beta);
  const p = 1 + s;
  const b = (p - arcLen - c - d) / 3;
  return { p, a: 2 * b, b, c, d };
})();

function traceSquircle(path: CanvasPath, x: number, y: number, size: number) {
  const { p, a, b, c, d } = CORNER;
  const r = Math.min(CHICLET_CORNER_RADIUS, 0.5 / p) * size;
  const e = p - a - b - c;
  const corners: [number, number, number, number, number, number][] = [
    [x + size, y, -1, 0, 0, 1],
    [x + size, y + size, 0, -1, -1, 0],
    [x, y + size, 1, 0, 0, -1],
    [x, y, 0, 1, 1, 0],
  ];
  path.moveTo(x + p * r, y);
  for (const [kx, ky, ux, uy, vx, vy] of corners) {
    const at = (s: number, t: number): [number, number] => [kx + (s * ux + t * vx) * r, ky + (s * uy + t * vy) * r];
    const [ox, oy] = at(1, 1);
    const [sx, sy] = at(e, d);
    const [tx, ty] = at(d, e);
    path.lineTo(...at(p, 0));
    path.bezierCurveTo(...at(p - a, 0), ...at(p - a - b, 0), sx, sy);
    path.arc(ox, oy, r, Math.atan2(sy - oy, sx - ox), Math.atan2(ty - oy, tx - ox));
    path.bezierCurveTo(...at(0, p - a - b), ...at(0, p - a), ...at(0, p));
  }
  path.closePath();
}

export function drawSquirclePath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  traceSquircle(ctx, x, y, size);
}

const squircleCache = new Map<number, Path2D>();

export function squirclePath(size: number): Path2D {
  let path = squircleCache.get(size);
  if (!path) {
    path = new Path2D();
    traceSquircle(path, 0, 0, size);
    squircleCache.set(size, path);
    if (squircleCache.size > 12) squircleCache.delete(squircleCache.keys().next().value!);
  }
  return path;
}

export function createBackgroundCanvas(
  config: { type: string; bgType?: 'preset' | 'custom'; stops?: { offset: number; color: string }[]; colors?: [string, string]; color?: string; angle?: number },
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (config.type === 'gradient' && (config.stops || config.colors)) {
    const angle = ((config.angle ?? 90) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const r = (Math.abs(cos) * width + Math.abs(sin) * height) / 2;
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createLinearGradient(
      cx - cos * r, cy - sin * r,
      cx + cos * r, cy + sin * r
    );
    
    if (config.bgType === 'custom' && config.stops && config.stops.length > 0) {
      config.stops.forEach((stop) => {
        grad.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color);
      });
    } else if (config.colors) {
      grad.addColorStop(0, config.colors[0]);
      grad.addColorStop(1, config.colors[1]);
    }
    
    ctx.fillStyle = grad;
  } else if (config.type === 'solid' && config.color) {
    ctx.fillStyle = config.color;
  } else {
    ctx.fillStyle = '#667eea';
  }

  ctx.fillRect(0, 0, width, height);
  return canvas;
}
