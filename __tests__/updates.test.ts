import { evaluate, isAllowedApkUrl, isNewer, megabytes, notesFor, parseLatest, sizeMatches } from '@/logic/updates';

const valid = {
  version: '0.7.1',
  versionCode: 8,
  url: 'https://github.com/TimurNazmutdinov/ShoppingList-android-apk/releases/tag/v0.7.1',
  notes: { ru: ['Правки'], kk: [], en: ['Fixes'] },
};

describe('parseLatest', () => {
  it('разбирает корректный файл', () => {
    expect(parseLatest(valid)?.versionCode).toBe(8);
  });
  it('отбрасывает мусор', () => {
    expect(parseLatest(null)).toBeNull();
    expect(parseLatest('x')).toBeNull();
    expect(parseLatest({ ...valid, versionCode: '8' })).toBeNull();
    expect(parseLatest({ ...valid, versionCode: 0 })).toBeNull();
    expect(parseLatest({ ...valid, versionCode: 8.5 })).toBeNull();
    expect(parseLatest({ ...valid, version: '' })).toBeNull();
    expect(parseLatest({ ...valid, url: 'javascript:alert(1)' })).toBeNull();
    expect(parseLatest({ ...valid, url: 'http://example.com' })).toBeNull();
  });
  it('без notes — пустые списки', () => {
    const { notes: _n, ...rest } = valid;
    expect(parseLatest(rest)?.notes).toEqual({ ru: [], kk: [], en: [] });
  });
});

describe('isNewer / evaluate', () => {
  it('новее только строго больший versionCode', () => {
    const info = parseLatest(valid)!;
    expect(isNewer(info, 7)).toBe(true);
    expect(isNewer(info, 8)).toBe(false);
    expect(isNewer(info, 9)).toBe(false);
  });
  it('возвращает статусы', () => {
    expect(evaluate(valid, 7, '0.7.0').status).toBe('update');
    expect(evaluate(valid, 8, '0.7.1')).toEqual({ status: 'latest', version: '0.7.1' });
    expect(evaluate({}, 7, '0.7.0').status).toBe('error');
  });
});

describe('notesFor', () => {
  const info = parseLatest(valid)!;
  it('берёт язык приложения', () => expect(notesFor(info, 'en')).toEqual(['Fixes']));
  it('нет заметок на языке → русские', () => expect(notesFor(info, 'kk')).toEqual(['Правки']));
});

const apk = 'https://github.com/TimurNazmutdinov/ShoppingList-android-apk/releases/download/v0.7.2/Checkpoint-0.7.2.apk';

describe('isAllowedApkUrl', () => {
  it('разрешает GitHub по https и .apk', () => {
    expect(isAllowedApkUrl(apk)).toBe(true);
    expect(isAllowedApkUrl('https://objects.githubusercontent.com/x/y/file.apk?sig=1')).toBe(true);
  });
  it('отклоняет чужие хосты, http, не-apk и обман с доменом', () => {
    expect(isAllowedApkUrl('https://evil.com/Checkpoint.apk')).toBe(false);
    expect(isAllowedApkUrl('https://github.com.evil.com/a.apk')).toBe(false);
    expect(isAllowedApkUrl('https://evil.com/github.com/a.apk')).toBe(false);
    expect(isAllowedApkUrl('http://github.com/a.apk')).toBe(false);
    expect(isAllowedApkUrl('https://github.com/a.zip')).toBe(false);
    expect(isAllowedApkUrl('')).toBe(false);
  });
});

describe('apkUrl и size в latest.json', () => {
  it('читает корректные', () => {
    const info = parseLatest({ ...valid, apkUrl: apk, size: 56000000 })!;
    expect(info.apkUrl).toBe(apk);
    expect(info.size).toBe(56000000);
  });
  it('чужой apkUrl и кривой size отбрасываются, обновление остаётся (ручная ссылка)', () => {
    const info = parseLatest({ ...valid, apkUrl: 'https://evil.com/a.apk', size: -5 })!;
    expect(info.apkUrl).toBeNull();
    expect(info.size).toBeNull();
  });
});

describe('sizeMatches / megabytes', () => {
  it('размер должен совпасть, если заявлен', () => {
    expect(sizeMatches(100, 100)).toBe(true);
    expect(sizeMatches(100, 99)).toBe(false);
    expect(sizeMatches(null, 5)).toBe(true);
    expect(sizeMatches(null, 0)).toBe(false);
  });
  it('мегабайты', () => {
    expect(megabytes(56 * 1024 * 1024)).toBe('56');
    expect(megabytes(2.5 * 1024 * 1024)).toBe('2.5');
  });
});
