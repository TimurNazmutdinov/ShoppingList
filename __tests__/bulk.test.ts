import { isStructured, parseBulk, parseBulkPart, splitBulk } from '@/logic/bulk';

describe('splitBulk', () => {
  it('по запятым, строкам и «;»', () => {
    expect(splitBulk('молоко, хлеб; яйца\nсыр')).toEqual(['молоко', 'хлеб', 'яйца', 'сыр']);
  });
  it('запятая между цифрами — десятичная', () => {
    expect(splitBulk('молоко 0,5 л, хлеб')).toEqual(['молоко 0,5 л', 'хлеб']);
  });
  it('пустые части отбрасываются', () => {
    expect(splitBulk(' , ,\n\n')).toEqual([]);
  });
});

describe('parseBulkPart', () => {
  it('количество и единица в начале или в конце', () => {
    expect(parseBulkPart('2 кг сыра')).toEqual({ title: 'сыра', qty: 2, unit: 'kg' });
    expect(parseBulkPart('сыр 200 г')).toEqual({ title: 'сыр', qty: 200, unit: 'g' });
    expect(parseBulkPart('яйца 10 шт')).toEqual({ title: 'яйца', qty: 10, unit: 'pcs' });
    expect(parseBulkPart('молоко 0,5 л')).toEqual({ title: 'молоко', qty: 0.5, unit: 'l' });
  });
  it('число в начале без единицы — количество', () => {
    expect(parseBulkPart('2 яйца')).toEqual({ title: 'яйца', qty: 2, unit: null });
  });
  it('число в конце без единицы остаётся в названии', () => {
    expect(parseBulkPart('Йогурт 3')).toEqual({ title: 'Йогурт 3', qty: null, unit: null });
    expect(parseBulkPart('Молоко 3,2%')).toEqual({ title: 'Молоко 3,2%', qty: null, unit: null });
  });
  it('маркеры и нумерация убираются', () => {
    expect(parseBulkPart('- хлеб')).toEqual({ title: 'хлеб', qty: null, unit: null });
    expect(parseBulkPart('☐ хлеб')).toEqual({ title: 'хлеб', qty: null, unit: null });
    expect(parseBulkPart('1. хлеб')).toEqual({ title: 'хлеб', qty: null, unit: null });
  });
  it('казахские и английские единицы', () => {
    expect(parseBulkPart('жұмыртқа 10 дана')).toEqual({ title: 'жұмыртқа', qty: 10, unit: 'pcs' });
    expect(parseBulkPart('2 kg rice')).toEqual({ title: 'rice', qty: 2, unit: 'kg' });
  });
});

describe('parseBulk / isStructured', () => {
  it('список из мессенджера', () => {
    const items = parseBulk('Молоко 1 л\nХлеб\n2 кг картофеля, яйца 10 шт');
    expect(items.map((i) => i.title)).toEqual(['Молоко', 'Хлеб', 'картофеля', 'яйца']);
    expect(items[2]).toMatchObject({ qty: 2, unit: 'kg' });
  });
  it('обычное название — не структурировано; несколько или с количеством — да', () => {
    expect(isStructured(parseBulk('Молоко'))).toBe(false);
    expect(isStructured(parseBulk('молоко, хлеб'))).toBe(true);
    expect(isStructured(parseBulk('молоко 2 л'))).toBe(true);
    expect(isStructured(parseBulk(''))).toBe(false);
  });
});
