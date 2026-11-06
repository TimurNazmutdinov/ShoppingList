import { plural, t, tn, word } from '@/i18n';

const DAYS = ['день', 'дня', 'дней'] as const;

describe('plural', () => {
  it.each([
    [0, 'дней'],
    [1, 'день'],
    [2, 'дня'],
    [4, 'дня'],
    [5, 'дней'],
    [11, 'дней'],
    [12, 'дней'],
    [14, 'дней'],
    [21, 'день'],
    [22, 'дня'],
    [25, 'дней'],
    [101, 'день'],
    [111, 'дней'],
    [112, 'дней'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, DAYS)).toBe(expected);
  });

  it('отрицательные числа склоняются как положительные', () => {
    expect(plural(-1, DAYS)).toBe('день');
    expect(plural(-5, DAYS)).toBe('дней');
  });
});

describe('t / tn / word', () => {
  it('подставляет параметры', () => {
    expect(t('date.left', { days: '3 дня' })).toBe('осталось 3 дня');
  });

  it('оставляет незаданный плейсхолдер как есть', () => {
    expect(t('date.left', {})).toBe('осталось {days}');
  });

  it('tn добавляет число', () => {
    expect(tn('unit.day', 2)).toBe('2 дня');
    expect(tn('unit.item', 5)).toBe('5 товаров');
    expect(tn('unit.item', 21)).toBe('21 товар');
  });

  it('word — только слово', () => {
    expect(word('unit.item', 1)).toBe('товар');
    expect(word('unit.item', 3)).toBe('товара');
  });
});
