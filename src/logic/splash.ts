// Живая заставка: чистые функции «значения слоёв в момент t (мс)» по splashAnimation.json.
// Все функции — worklet: их вызывают из анимации на UI-потоке и из тестов.
import anim from './splashAnimation.json';

const T = anim.timeline;

export const TOTAL_MS: number = T.totalMs;
export const MARK_SIZE_DP: number = anim.markSizeDp;
export const MARK_UNITS = 120; // сетка знака
export const PRODUCT_COUNT: number = T.products.length;
export const BAG_ORIGIN: readonly number[] = T.bag.origin;
export const PATHS = anim.paths;

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

const lerp = (a: number, b: number, p: number) => {
  'worklet';
  return a + (b - a) * p;
};

// Кривая cubic-bezier(x1, y1, x2, y2): по доле времени x даёт долю пути (может выходить за 0..1 — «пружинка»).
export function easeBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  // решаем bezierX(s) = x: несколько шагов Ньютона, затем деление пополам
  let s = x;
  for (let i = 0; i < 6; i++) {
    const err = ((ax * s + bx) * s + cx) * s - x;
    const d = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(err) < 1e-6 || Math.abs(d) < 1e-6) break;
    s -= err / d;
  }
  if (s < 0 || s > 1 || Math.abs(((ax * s + bx) * s + cx) * s - x) > 1e-4) {
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 24; i++) {
      const v = ((ax * s + bx) * s + cx) * s;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
  }
  return ((ay * s + by) * s + cy) * s;
}

// ---- Пакет ----

export type BagState = { opacity: number; sx: number; sy: number; ty: number };

// Трансформация пакета: translate(0, ty) · scale(sx, sy) относительно низа пакета.
export function bagAt(t: number): BagState {
  'worklet';
  const keys = T.bag.keys;
  const fade = clamp01((t - T.bag.fadeIn.fromMs) / T.bag.fadeIn.ms);
  const last = keys[keys.length - 1];
  if (t <= keys[0].t) return { opacity: fade, sx: keys[0].sx, sy: keys[0].sy, ty: keys[0].ty };
  if (t >= last.t) return { opacity: fade, sx: last.sx, sy: last.sy, ty: last.ty };
  let k = 0;
  while (k < keys.length - 2 && t >= keys[k + 1].t) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const e = easeBezier(a.ease[0], a.ease[1], a.ease[2], a.ease[3], (t - a.t) / (b.t - a.t));
  return { opacity: fade, sx: lerp(a.sx, b.sx, e), sy: lerp(a.sy, b.sy, e), ty: lerp(a.ty, b.ty, e) };
}

// ---- Продукты ----

export type ProductState = { x: number; y: number; rot: number; opacity: number };

// Полёт по квадратичной кривой: P0 = from, P1 = ((x0+x2)/2, 2·apexY − (y0+y2)/2), P2 = to.
export function productAt(index: number, t: number): ProductState {
  'worklet';
  const p = T.products[index];
  const q = clamp01((t - p.startMs) / p.flyMs);
  const [x0, y0] = p.from;
  const [x2, y2] = p.to;
  const x1 = (x0 + x2) / 2;
  const y1 = 2 * p.apexY - (y0 + y2) / 2;
  const u = 1 - q;
  const x = u * u * x0 + 2 * u * q * x1 + q * q * x2;
  const y = u * u * y0 + 2 * u * q * y1 + q * q * y2;
  const rot = lerp(p.rot[0], p.rot[1], q);
  // в последнюю 1/16 полёта продукт гаснет (он уже за корпусом)
  const opacity = q > 15 / 16 ? clamp01(1 - (q - 15 / 16) * 16) : 1;
  return { x, y, rot, opacity };
}

// ---- Тень ----

export type ShadowState = { opacity: number; sx: number };

export function shadowAt(t: number): ShadowState {
  'worklet';
  const keys = T.shadow.keys;
  const last = keys[keys.length - 1];
  if (t <= keys[0].t) return { opacity: keys[0].opacity, sx: keys[0].sx };
  if (t >= last.t) return { opacity: last.opacity, sx: last.sx };
  let k = 0;
  while (k < keys.length - 2 && t >= keys[k + 1].t) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const p = (t - a.t) / (b.t - a.t);
  return { opacity: lerp(a.opacity, b.opacity, p), sx: lerp(a.sx, b.sx, p) };
}

// ---- Галочка ----

export const CHECK_PATH: string = PATHS.check;

// strokeDashoffset: 71 (не видно) → 70 − длина (нарисована слева направо) → 0.
export function checkDashOffset(t: number): number {
  'worklet';
  const c = T.check;
  if (t <= c.startMs) return 71;
  if (t >= c.startMs + c.drawMs) return 0;
  const e = easeBezier(c.ease[0], c.ease[1], c.ease[2], c.ease[3], (t - c.startMs) / c.drawMs);
  return lerp(71, 70 - c.length, e);
}

// ---- Свечение ----

export type GlowState = { opacity: number; scale: number };

export function glowAt(t: number): GlowState {
  'worklet';
  const g = T.glow;
  const q = easeBezier(g.ease[0], g.ease[1], g.ease[2], g.ease[3], clamp01((t - g.startMs) / g.ms));
  const at = g.opacity.at;
  const seg = q < at[1] ? 0 : 1;
  const u = (q - at[seg]) / (at[seg + 1] - at[seg]);
  return {
    opacity: lerp(g.opacity.v[seg], g.opacity.v[seg + 1], u),
    scale: lerp(g.scale.v[seg], g.scale.v[seg + 1], u),
  };
}

// ---- Тексты ----

export type TextId = 'name' | 'slogan' | 'badge' | 'hint';
export type TextState = { opacity: number; ty: number };

// opacity 0 → 1 и сдвиг вверх fromY → 0 (dp).
export function textAt(id: TextId, t: number): TextState {
  'worklet';
  const item = T.texts.find((x) => x.id === id);
  if (!item) return { opacity: 1, ty: 0 };
  const a = T.textAnim;
  const fromY = 'fromY' in item && typeof item.fromY === 'number' ? item.fromY : a.fromY;
  const e = easeBezier(a.ease[0], a.ease[1], a.ease[2], a.ease[3], clamp01((t - item.startMs) / a.ms));
  return { opacity: clamp01(e), ty: lerp(fromY, 0, e) };
}

// ---- Продукты: рисунок из json ----

export type ArtElement = { tag: 'path' | 'ellipse' | 'rect'; props: Record<string, string> };

const CAMEL: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
};

// Разбор svg-строки продукта (path / ellipse / rect) в список элементов для react-native-svg.
export function parseArt(svg: string): ArtElement[] {
  const result: ArtElement[] = [];
  const tag = /<(path|ellipse|rect)\s+([^>]*?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(svg)) !== null) {
    const props: Record<string, string> = {};
    const attr = /([\w-]+)="([^"]*)"/g;
    let a: RegExpExecArray | null;
    while ((a = attr.exec(m[2])) !== null) props[CAMEL[a[1]] ?? a[1]] = a[2];
    result.push({ tag: m[1] as ArtElement['tag'], props });
  }
  return result;
}

export const PRODUCT_ART: { id: string; scale: number; elements: ArtElement[] }[] = anim.products.map((p) => ({
  id: p.id,
  scale: p.scale,
  elements: parseArt(p.svg),
}));

// Геометрия свечения и тени (центр, радиусы) — из json, для экрана.
export const GLOW = { center: anim.timeline.glow.center, r: anim.timeline.glow.r, stopOpacity: anim.timeline.glow.stopOpacity };
export const SHADOW = { center: anim.timeline.shadow.center, radius: anim.timeline.shadow.radius };
