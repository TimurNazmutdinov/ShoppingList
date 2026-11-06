function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

// Контраст двух цветов по WCAG: от 1 до 21.
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Тёмный и белый текст для цветных плашек: берётся тот, что контрастнее.
export const onColorDark = '#0B0A1F';
export const onColorLight = '#FFFFFF';

export function readableTextOn(hex: string): string {
  return contrastRatio(hex, onColorDark) >= contrastRatio(hex, onColorLight) ? onColorDark : onColorLight;
}
