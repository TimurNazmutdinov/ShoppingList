import { contrastRatio, onColorLight, readableTextOn } from '@/logic/color';
import { DEFAULT_LIST_COLOR, Scheme, darkColors, lightColors, listColor, listColorKeys, listPalettes, isListColorKey } from '@/theme';

const schemes: Scheme[] = ['dark', 'light'];

describe('цвета списков', () => {
  it.each(schemes)('%s: двенадцать ключей, у каждого свой цвет', (scheme) => {
    expect(listColorKeys).toHaveLength(12);
    expect(new Set(listColorKeys.map((k) => listColor(k, scheme))).size).toBe(12);
    expect(Object.keys(listPalettes[scheme]).sort()).toEqual([...listColorKeys].sort());
  });

  it('неизвестный ключ → цвет по умолчанию', () => {
    expect(isListColorKey('teal')).toBe(true);
    expect(isListColorKey('mint')).toBe(false);
    expect(listColor('#5DCAA5', 'light')).toBe(listColor(DEFAULT_LIST_COLOR, 'light'));
    expect(listColor('', 'dark')).toBe(listColor(DEFAULT_LIST_COLOR, 'dark'));
  });

  it.each(schemes.flatMap((s) => listColorKeys.map((k) => [s, k] as const)))(
    '%s/%s: текст на плашке контрастен (≥ 4,5:1)',
    (scheme, key) => {
      const bg = listColor(key, scheme);
      expect(contrastRatio(bg, readableTextOn(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('readableTextOn выбирает белый на тёмном и тёмный на светлом', () => {
    expect(readableTextOn('#000000')).toBe(onColorLight);
    expect(readableTextOn('#FFFFFF')).not.toBe(onColorLight);
  });

  it('contrastRatio: чёрное на белом — 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
});

describe('переключатели', () => {
  it.each([
    ['dark', darkColors],
    ['light', lightColors],
  ] as const)('%s: контраст дорожки и бегунка ≥ 3:1', (_name, c) => {
    expect(contrastRatio(c.switchOn, c.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.switchOn, c.switchOnThumb)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.outline, c.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.switchOffThumb, c.card)).toBeGreaterThanOrEqual(3);
  });
});
