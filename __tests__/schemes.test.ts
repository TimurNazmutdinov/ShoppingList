import { contrastRatio } from '@/logic/color';
import {
  ACCENT_ICON_KEYS,
  ALL_ICON_KEYS,
  DEFAULT_ICON,
  LEGACY_ICON_KEYS,
  LEGACY_SCHEME_KEYS,
  iconChange,
  launcherIconKey,
  legacyAccent,
  logoAccent,
  migrateIconKey,
  migrateScheme,
  resolveMode,
  splashAccent,
  themeChoiceFromSettings,
} from '@/logic/schemes';
import { Scheme, accentColors, accentKeys, accentNames, brandAccent, buildPalette, isAccentKey, isThemeMode, listColorDefs, modeTokens, nativeSplashColors, themeDefaults } from '@/theme';

const MODES: Scheme[] = ['light', 'dark'];

describe('темы и цвета: состав', () => {
  it('8 цветов, 2 режима; по умолчанию «Как в системе» и фирменный «Янтарь», цвет — только к экранам', () => {
    expect(accentKeys).toEqual(['blue', 'amber', 'green', 'teal', 'coral', 'lilac', 'pink', 'graphite']);
    expect(themeDefaults).toEqual({ themeMode: 'system', accent: 'amber', applyScope: 'screens' });
    expect(brandAccent).toBe('amber');
  });

  it('названия цветов на трёх языках; у «Янтаря» — «Кәріптас» по-казахски', () => {
    for (const k of accentKeys) {
      for (const lang of ['ru', 'kk', 'en'] as const) expect(accentNames[k][lang].length).toBeGreaterThan(0);
    }
    expect(accentNames.amber).toEqual({ ru: 'Янтарь', kk: 'Кәріптас', en: 'Amber' });
  });

  it('проверки значений', () => {
    expect(isThemeMode('system') && isThemeMode('light') && isThemeMode('dark')).toBe(true);
    expect(isThemeMode('auto')).toBe(false);
    expect(isAccentKey('pink')).toBe(true);
    expect(isAccentKey('powder')).toBe(false);
    expect(isAccentKey('constructor')).toBe(false);
    expect(isAccentKey(5)).toBe(false);
  });

  it('палитра: прежние имена токенов + tonal / onTonal; соответствие как в tokenMapping', () => {
    const p = buildPalette('light', 'blue');
    const a = accentColors('blue', 'light');
    expect(p).toMatchObject({ scheme: 'light', accent: 'blue', primary: a.accent, onPrimary: a.onAccent, primaryStrong: a.onTonal, tonal: a.tonal, onTonal: a.onTonal });
    expect(p.bg).toBe(modeTokens('light').bg);
    expect(buildPalette('dark', 'blue').bg).toBe(modeTokens('dark').bg);
  });

  it('у светлой и тёмной палитр одинаковый набор токенов; синий в светлой теме — светлый #3E91FF', () => {
    expect(Object.keys(buildPalette('light', 'amber')).sort()).toEqual(Object.keys(buildPalette('dark', 'amber')).sort());
    expect(accentColors('blue', 'light').accent).toBe('#3E91FF');
  });
});

describe('контраст: 16 сочетаний режима и цвета', () => {
  const combos = MODES.flatMap((m) => accentKeys.map((k) => [m, k] as const));

  it.each(combos)('%s / %s: текст на фоне и карточке ≥ 4,5', (mode, accent) => {
    const p = buildPalette(mode, accent);
    for (const fg of [p.text, p.textMuted, p.onTonal]) {
      expect(contrastRatio(fg, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fg, p.card)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(combos)('%s / %s: onTonal на tonal ≥ 4,5; onAccent на accent ≥ 3; outline на фоне ≥ 3', (mode, accent) => {
    const p = buildPalette(mode, accent);
    expect(contrastRatio(p.onTonal, p.tonal)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.outline, p.bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(combos)('%s / %s: переключатель — дорожка и бегунок ≥ 3:1', (mode, accent) => {
    const p = buildPalette(mode, accent);
    expect(contrastRatio(p.switchOn, p.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.switchOn, p.switchOnThumb)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.outline, p.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.switchOffThumb, p.card)).toBeGreaterThanOrEqual(3);
  });

  it.each(MODES)('%s: цвет предупреждения читается на фоне и карточках; цвета списков различимы на них', (mode) => {
    const t = modeTokens(mode);
    for (const bg of [t.bg, t.card, t.cardStrong]) {
      expect(contrastRatio(t.warn, bg)).toBeGreaterThanOrEqual(3);
      for (const c of listColorDefs) expect(contrastRatio(mode === 'light' ? c.light : c.dark, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('режим: «Как в системе»', () => {
  it('выбранный вручную главнее темы телефона', () => {
    expect(resolveMode('light', 'dark')).toBe('light');
    expect(resolveMode('dark', 'light')).toBe('dark');
  });

  it('«Как в системе» идёт по теме телефона; нет данных → тёмная', () => {
    expect(resolveMode('system', 'light')).toBe('light');
    expect(resolveMode('system', 'dark')).toBe('dark');
    expect(resolveMode('system', null)).toBe('dark');
    expect(resolveMode('system', undefined)).toBe('dark');
  });
});

describe('миграция старых профилей (14 цветных фонов + «Как в системе»)', () => {
  // Таблица из задания 0.7.5: старое значение → [тема, цвет].
  const expected: Record<string, [string, string]> = {
    system: ['system', 'amber'],
    white: ['light', 'blue'],
    powder: ['light', 'pink'],
    beige: ['light', 'amber'],
    vanilla: ['light', 'amber'],
    peach: ['light', 'coral'],
    mint: ['light', 'teal'],
    sky: ['light', 'blue'],
    night: ['dark', 'blue'],
    dusk: ['dark', 'lilac'],
    graphite: ['dark', 'graphite'],
    sea: ['dark', 'teal'],
    emerald: ['dark', 'green'],
    berry: ['dark', 'pink'],
    cocoa: ['dark', 'amber'],
  };

  it.each(Object.entries(expected))('%s → тема и цвет по таблице', (old, [themeMode, accent]) => {
    expect(migrateScheme(old)).toEqual({ themeMode, accent });
  });

  it('все 15 значений покрыты; каждый цвет существует', () => {
    expect(Object.keys(expected)).toHaveLength(15);
    expect([...LEGACY_SCHEME_KEYS].sort()).toEqual(Object.keys(expected).filter((k) => k !== 'system').sort());
    for (const [, [, accent]] of Object.entries(expected)) expect(isAccentKey(accent)).toBe(true);
  });

  it('«Как в системе» из 0.7.4 со своим светлым профилем берёт цвет от него', () => {
    expect(migrateScheme('system', 'powder')).toEqual({ themeMode: 'system', accent: 'pink' });
    expect(migrateScheme('system', 'vanilla')).toEqual({ themeMode: 'system', accent: 'amber' });
    expect(migrateScheme('system', 'нет такого')).toEqual({ themeMode: 'system', accent: 'amber' });
    expect(migrateScheme('system')).toEqual({ themeMode: 'system', accent: 'amber' });
  });

  it('мусор и служебные ключи не принимаются', () => {
    for (const bad of [undefined, null, 5, '', 'note', 'constructor', '__proto__', 'neon']) expect(migrateScheme(bad)).toBeNull();
    expect(legacyAccent('system')).toBeNull();
    expect(legacyAccent('note')).toBeNull();
    expect(legacyAccent('powder')).toBe('pink');
  });

  it('что хранится → выбор: новые значения главнее, старый профиль переводится и помечается, иначе умолчания', () => {
    expect(themeChoiceFromSettings({ themeMode: 'dark', accent: 'teal', scheme: 'powder' })).toEqual({ themeMode: 'dark', accent: 'teal', migrated: false });
    expect(themeChoiceFromSettings({ scheme: 'night' })).toEqual({ themeMode: 'dark', accent: 'blue', migrated: true });
    expect(themeChoiceFromSettings({ scheme: 'system', systemLight: 'peach' })).toEqual({ themeMode: 'system', accent: 'coral', migrated: true });
    expect(themeChoiceFromSettings({})).toEqual({ themeMode: 'system', accent: 'amber', migrated: false });
    expect(themeChoiceFromSettings({ themeMode: 'light', scheme: 'cocoa' })).toEqual({ themeMode: 'light', accent: 'amber', migrated: true });
  });
});

describe('логотип, заставка, иконка', () => {
  it('«Только к экранам» — фирменный знак; «Ко всему» — цвет акцента', () => {
    expect(logoAccent('screens', 'pink')).toBe('amber');
    expect(logoAccent('all', 'pink')).toBe('pink');
    expect(splashAccent('screens', 'blue')).toBe('amber');
    expect(splashAccent('all', 'blue')).toBe('blue');
  });

  it('иконка: «Только к экранам» и «Янтарь» — основная; остальным акцентам — своя', () => {
    expect(launcherIconKey('screens', 'blue')).toBe(DEFAULT_ICON);
    expect(launcherIconKey('all', 'amber')).toBe(DEFAULT_ICON);
    expect(launcherIconKey('all', 'blue')).toBe('blue');
  });

  it('смена иконки: новая — вопрос, возврат к основной и отказ — без вопроса', () => {
    expect(iconChange('all', 'pink', DEFAULT_ICON, false)).toEqual({ target: 'pink', ask: true });
    expect(iconChange('all', 'pink', 'pink', false)).toEqual({ target: 'pink', ask: false });
    expect(iconChange('screens', 'pink', 'pink', false)).toEqual({ target: DEFAULT_ICON, ask: false });
    expect(iconChange('all', 'pink', DEFAULT_ICON, true)).toEqual({ target: DEFAULT_ICON, ask: false });
  });

  it('набор иконок: основная + 7 по цветам + 12 старых; без повторов', () => {
    expect(ACCENT_ICON_KEYS).toEqual(['blue', 'green', 'teal', 'coral', 'lilac', 'pink', 'graphite']);
    expect(LEGACY_ICON_KEYS).toHaveLength(12);
    expect(ALL_ICON_KEYS).toHaveLength(20);
    expect(new Set(ALL_ICON_KEYS).size).toBe(ALL_ICON_KEYS.length);
    expect(ALL_ICON_KEYS[0]).toBe(DEFAULT_ICON);
  });

  it('сохранённая иконка до 0.7.5 переводится в иконку цвета — значок на рабочем столе не пропадает', () => {
    expect(migrateIconKey('powder')).toBe('pink');
    expect(migrateIconKey('white')).toBe('blue');
    expect(migrateIconKey('night')).toBe('blue');
    expect(migrateIconKey('sea')).toBe('teal');
    expect(migrateIconKey('graphite')).toBe('graphite');
    expect(migrateIconKey('beige')).toBe(DEFAULT_ICON);
    expect(migrateIconKey('cocoa')).toBe(DEFAULT_ICON);
    expect(migrateIconKey(DEFAULT_ICON)).toBe(DEFAULT_ICON);
    expect(migrateIconKey('lilac')).toBe('lilac');
    expect(migrateIconKey('amber')).toBe(DEFAULT_ICON);
    expect(migrateIconKey(null)).toBe(DEFAULT_ICON);
    expect(migrateIconKey('что-то')).toBe(DEFAULT_ICON);
    // результат всегда есть среди ключей, которые знает модуль иконок
    for (const old of LEGACY_SCHEME_KEYS) expect(ALL_ICON_KEYS).toContain(migrateIconKey(old));
  });

  it('у каждого цвета (кроме «Янтаря») есть файлы иконки', () => {
    const fsx = jest.requireActual('fs') as typeof import('fs');
    for (const k of ACCENT_ICON_KEYS) {
      expect(fsx.existsSync('assets/icons/schemes/ic_accent_' + k + '_fg.png')).toBe(true);
      expect(fsx.existsSync('assets/icons/schemes/ic_accent_' + k + '_legacy.png')).toBe(true);
    }
  });

  it('нативная заставка в app.json совпадает с фоном тем', () => {
    const fsx = jest.requireActual('fs') as typeof import('fs');
    const app = JSON.parse(fsx.readFileSync('app.json', 'utf8')).expo;
    const splash = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
    expect(splash.backgroundColor).toBe(nativeSplashColors.light);
    expect(splash.dark.backgroundColor).toBe(nativeSplashColors.dark);
    expect(nativeSplashColors.light).toBe(modeTokens('light').bg);
    expect(nativeSplashColors.dark).toBe(modeTokens('dark').bg);
  });
});
