import { contrastRatio } from '@/logic/color';
import {
  ALL_ICON_KEYS,
  DEFAULT_ICON,
  DEFAULT_PICKS,
  activeSchemeKey,
  cleanPicks,
  logoSchemeKey,
  schemeChoiceFromSettings,
  schemeFrom075,
  splashSchemeKey,
} from '@/logic/schemes';
import { SchemeKey, buildPalette, darkSchemeKeys, lightSchemeKeys, listColorDefs, nativeSplashColors, schemeDefs, themeDefaults } from '@/theme';

const KEYS = Object.keys(schemeDefs) as SchemeKey[];

describe('цветовые профили', () => {
  it('14 профилей: 7 светлых и 7 тёмных; по умолчанию «Как в системе», «Янтарь» и «Какао»', () => {
    expect(lightSchemeKeys).toHaveLength(7);
    expect(darkSchemeKeys).toHaveLength(7);
    expect(themeDefaults).toEqual({ schemeSetting: 'system', lightScheme: 'vanilla', darkScheme: 'cocoa' });
  });

  it('«Белая»: бледно-синие большие кнопки, синий «+»; у тёмных большие кнопки = primary', () => {
    const p = buildPalette('white');
    expect(p).toMatchObject({ bg: '#FFFFFF', primary: '#3E91FF', tonal: '#EAF3FF', onTonal: '#1D69C9' });
    for (const k of darkSchemeKeys) {
      const d = buildPalette(k);
      expect([d.tonal, d.onTonal]).toEqual([d.primary, d.onPrimary]);
    }
  });
});

describe('контраст 14 профилей', () => {
  it.each(KEYS)('%s: текст на фоне ≥ 4,9; onTonal на tonal, bg и card ≥ 4,5; значок на primary ≥ 3', (key) => {
    const p = buildPalette(key);
    for (const fg of [p.text, p.textMuted]) {
      expect(contrastRatio(fg, p.bg)).toBeGreaterThanOrEqual(4.9);
      expect(contrastRatio(fg, p.card)).toBeGreaterThanOrEqual(4.5);
    }
    // у светлых onTonal — ещё и акцентный текст на фоне и карточках; у тёмных tonal = primary, onTonal — только текст на нём
    for (const bg of p.scheme === 'light' ? [p.tonal, p.bg, p.card] : [p.tonal]) expect(contrastRatio(p.onTonal, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(3);
  });

  it.each(KEYS)('%s: primaryStrong, предупреждение и цвета списков ≥ 3 на фоне и карточках; переключатель читается', (key) => {
    const p = buildPalette(key);
    for (const bg of [p.card, p.cardStrong, p.bg]) {
      expect(contrastRatio(p.primaryStrong, bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(p.warn, bg)).toBeGreaterThanOrEqual(3);
      for (const c of listColorDefs) expect(contrastRatio(p.scheme === 'light' ? c.light : c.dark, bg)).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(p.switchOn, p.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.switchOn, p.switchOnThumb)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.outline, p.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('«Как в системе»', () => {
  it('выбранный вручную главнее; иначе по теме телефона (нет данных → тёмная) и своим профилям', () => {
    expect(activeSchemeKey('night', 'light')).toBe('night');
    expect(activeSchemeKey('system', 'light')).toBe('vanilla');
    expect(activeSchemeKey('system', null)).toBe('cocoa');
    expect(activeSchemeKey('system', 'light', { light: 'mint', dark: 'sea' })).toBe('mint');
    expect(activeSchemeKey('system', 'dark', { light: 'mint', dark: 'sea' })).toBe('sea');
  });

  it('профиль подходит только своей теме; мусор → профиль по умолчанию', () => {
    expect(cleanPicks('mint', 'sea')).toEqual({ light: 'mint', dark: 'sea' });
    expect(cleanPicks('sea', 'mint')).toEqual(DEFAULT_PICKS);
    expect(cleanPicks('нет', null)).toEqual(DEFAULT_PICKS);
  });
});

describe('миграция 0.7.5 → 0.7.6: 3 режима × 8 цветов', () => {
  const light = { blue: 'white', amber: 'vanilla', green: 'mint', teal: 'mint', coral: 'peach', lilac: 'sky', pink: 'powder', graphite: 'white' };
  const dark = { blue: 'night', amber: 'cocoa', green: 'emerald', teal: 'sea', coral: 'berry', lilac: 'dusk', pink: 'berry', graphite: 'graphite' };
  const cases = (['light', 'dark', 'system'] as const).flatMap((m) => Object.keys(light).map((c) => [m, c] as const));

  it.each(cases)('%s / %s → профиль по таблице', (mode, accent) => {
    const l = light[accent as keyof typeof light];
    const d = dark[accent as keyof typeof dark];
    const r = schemeChoiceFromSettings({ themeMode: mode, accent });
    expect(r.migrated).toBe(true);
    if (mode === 'light') expect(r.setting).toBe(l);
    else if (mode === 'dark') expect(r.setting).toBe(d);
    else expect(r).toMatchObject({ setting: 'system', picks: { light: l, dark: d } });
  });

  it('значения 0.7.4 главнее; без них и без 0.7.5 — по умолчанию; мусор не принимается', () => {
    expect(schemeChoiceFromSettings({ scheme: 'powder', systemLight: 'mint', themeMode: 'dark', accent: 'blue' })).toEqual({ setting: 'powder', picks: { light: 'mint', dark: 'cocoa' }, migrated: false });
    expect(schemeChoiceFromSettings({})).toEqual({ setting: 'system', picks: DEFAULT_PICKS, migrated: false });
    expect(schemeFrom075('light', 'constructor')).toBeNull();
    expect(schemeFrom075('auto', 'blue')).toBeNull();
  });
});

describe('заставка и значок не зависят от профиля', () => {
  it('заставка: «Янтарь» при светлой теме телефона, «Какао» при тёмной (нет данных → «Какао»)', () => {
    expect(splashSchemeKey('light')).toBe('vanilla');
    expect(splashSchemeKey('dark')).toBe('cocoa');
    expect(splashSchemeKey(null)).toBe('cocoa');
  });

  it('знак: любой светлый профиль → «Янтарь», любой тёмный → «Какао»', () => {
    for (const k of lightSchemeKeys) expect(logoSchemeKey(k)).toBe('vanilla');
    for (const k of darkSchemeKeys) expect(logoSchemeKey(k)).toBe('cocoa');
  });

  it('значок: основной и все алиасы без повторов; нативная заставка совпадает с фоном «Янтаря» и «Какао»', () => {
    expect(ALL_ICON_KEYS[0]).toBe(DEFAULT_ICON);
    expect(new Set(ALL_ICON_KEYS).size).toBe(ALL_ICON_KEYS.length);
    const fsx = jest.requireActual('fs') as typeof import('fs');
    const app = JSON.parse(fsx.readFileSync('app.json', 'utf8')).expo;
    const splash = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
    expect(splash.backgroundColor).toBe(nativeSplashColors.light);
    expect(splash.dark.backgroundColor).toBe(nativeSplashColors.dark);
    expect(nativeSplashColors.light).toBe(schemeDefs.vanilla.tokens.bg);
    expect(nativeSplashColors.dark).toBe(schemeDefs.cocoa.tokens.bg);
  });
});
