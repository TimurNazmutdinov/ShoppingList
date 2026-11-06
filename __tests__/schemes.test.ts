import { contrastRatio } from '@/logic/color';
import { activeSchemeKey, logoSchemeKey, splashSchemeKey } from '@/logic/schemes';
import {
  SchemeKey,
  buildPalette,
  darkSchemeKeys,
  lightSchemeKeys,
  listColorDefs,
  schemeDefs,
  themeDefaults,
} from '@/theme';

const TOKEN_KEYS = ['bg', 'card', 'cardBorder', 'cardStrong', 'track', 'text', 'textMuted', 'primary', 'onPrimary', 'primaryStrong', 'warn', 'outline'];
const HEX = /^#[0-9A-Fa-f]{6}$/;
const keys = Object.keys(schemeDefs) as SchemeKey[];

describe('цветовые схемы', () => {
  it('14 схем: 7 светлых и 7 тёмных', () => {
    expect(keys).toHaveLength(14);
    expect(lightSchemeKeys).toHaveLength(7);
    expect(darkSchemeKeys).toHaveLength(7);
  });

  it('значения по умолчанию существуют и подходят по режиму', () => {
    expect(schemeDefs[themeDefaults.lightScheme].mode).toBe('light');
    expect(schemeDefs[themeDefaults.darkScheme].mode).toBe('dark');
    expect(themeDefaults.schemeSetting).toBe('system');
  });

  it.each(keys)('%s: одинаковый набор токенов и все цвета — hex', (key) => {
    const tokens = schemeDefs[key].tokens as Record<string, string>;
    expect(Object.keys(tokens).sort()).toEqual([...TOKEN_KEYS].sort());
    for (const v of Object.values(tokens)) expect(v).toMatch(HEX);
    expect(Object.keys(buildPalette(key)).sort()).toEqual(Object.keys(buildPalette('white')).sort());
  });

  it('у всех 12 цветов списков есть светлый и тёмный вариант и названия на трёх языках', () => {
    expect(listColorDefs).toHaveLength(12);
    for (const c of listColorDefs) {
      expect(c.light).toMatch(HEX);
      expect(c.dark).toMatch(HEX);
      expect(c.name.ru && c.name.kk && c.name.en).toBeTruthy();
    }
  });

  it('у каждой схемы есть название на трёх языках и цвета знака from/to', () => {
    for (const k of keys) {
      const d = schemeDefs[k];
      expect(d.name.ru && d.name.kk && d.name.en).toBeTruthy();
      expect(d.mark.from).toMatch(HEX);
      expect(d.mark.to).toMatch(HEX);
    }
  });
});

describe('логотип и заставка', () => {
  it('«Янтарь» по умолчанию: светлый — ваниль, тёмный — какао, знак янтарный', () => {
    expect(themeDefaults.lightScheme).toBe('vanilla');
    expect(themeDefaults.darkScheme).toBe('cocoa');
    expect(schemeDefs.vanilla.name.ru).toBe('Янтарь');
    expect(schemeDefs.vanilla.mark).toEqual({ from: '#FFC83D', to: '#F0702A' });
  });
});

// Пороги — как в note из themes.json.
describe('контраст схем', () => {
  it.each(keys)('%s: текст ≥ 4,5:1 к card и bg', (key) => {
    const t = schemeDefs[key].tokens;
    for (const fg of [t.text, t.textMuted]) {
      expect(contrastRatio(fg, t.card)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fg, t.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(keys)('%s: onPrimary к primary ≥ 4,5:1', (key) => {
    const t = schemeDefs[key].tokens;
    expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(keys)('%s: primaryStrong и warn ≥ 3:1 к card, cardStrong, bg', (key) => {
    const t = schemeDefs[key].tokens;
    for (const fg of [t.primaryStrong, t.warn]) {
      for (const bg of [t.card, t.cardStrong, t.bg]) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(keys)('%s: все цвета списков ≥ 3:1 к card, cardStrong, bg', (key) => {
    const { mode, tokens: t } = schemeDefs[key];
    for (const c of listColorDefs) {
      const color = mode === 'light' ? c.light : c.dark;
      for (const bg of [t.card, t.cardStrong, t.bg]) expect(contrastRatio(color, bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(keys)('%s: переключатель — дорожка и бегунок ≥ 3:1', (key) => {
    const c = buildPalette(key);
    expect(contrastRatio(c.switchOn, c.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.switchOn, c.switchOnThumb)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.outline, c.card)).toBeGreaterThanOrEqual(3);
  });
});

describe('активный профиль', () => {
  it('выбранный вручную главнее темы телефона', () => {
    expect(activeSchemeKey('powder', 'dark')).toBe('powder');
    expect(activeSchemeKey('berry', 'light')).toBe('berry');
  });

  it('«как в системе» идёт по теме телефона; нет данных → тёмная', () => {
    expect(activeSchemeKey('system', 'light')).toBe(themeDefaults.lightScheme);
    expect(activeSchemeKey('system', 'dark')).toBe(themeDefaults.darkScheme);
    expect(activeSchemeKey('system', null)).toBe(themeDefaults.darkScheme);
    expect(activeSchemeKey('system', undefined)).toBe(themeDefaults.darkScheme);
  });
});

describe('куда применять цвета профиля', () => {
  it('по умолчанию — только к экранам', () => {
    expect(themeDefaults.applyScope).toBe('screens');
  });

  it('«Ко всему»: логотип и заставка — в цвет активного профиля', () => {
    expect(logoSchemeKey('all', 'powder')).toBe('powder');
    expect(splashSchemeKey('all', 'berry', 'light')).toBe('berry');
    expect(splashSchemeKey('all', 'system', 'dark')).toBe(themeDefaults.darkScheme);
  });

  it('«Только к экранам»: логотип и заставка — фирменный «Янтарь»', () => {
    expect(logoSchemeKey('screens', 'powder')).toBe(themeDefaults.lightScheme);
    expect(logoSchemeKey('screens', 'berry')).toBe(themeDefaults.darkScheme);
    expect(splashSchemeKey('screens', 'berry', 'light')).toBe(themeDefaults.lightScheme);
    expect(splashSchemeKey('screens', 'powder', 'dark')).toBe(themeDefaults.darkScheme);
    expect(splashSchemeKey('screens', 'powder', null)).toBe(themeDefaults.darkScheme);
  });
});
