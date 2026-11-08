import { bulkPreview, isStructured, parseBulk, parseBulkPart, priceMarkers, splitBulk } from '@/logic/bulk';

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

describe('слова-числа (голосовой ввод)', () => {
  it('«рис одна пачка 500 тенге» — количество, упаковка и цена', () => {
    expect(parseBulkPart('Рис одна пачка 500 тенге')).toEqual({ title: 'Рис', qty: 1, unit: 'pack', price: 500 });
    expect(parseBulkPart('Рис одна упаковка 500 тенге')).toEqual({ title: 'Рис', qty: 1, unit: 'pack', price: 500 });
    expect(parseBulkPart('Рис две пачки 1 000 тг')).toEqual({ title: 'Рис', qty: 2, unit: 'pack', price: 1000 });
  });

  it('слово-число в начале и падежные формы единиц', () => {
    expect(parseBulkPart('две пачки риса')).toEqual({ title: 'риса', qty: 2, unit: 'pack' });
    expect(parseBulkPart('рис одну пачку')).toEqual({ title: 'рис', qty: 1, unit: 'pack' });
    expect(parseBulkPart('пять пачек чая')).toEqual({ title: 'чая', qty: 5, unit: 'pack' });
    expect(parseBulkPart('один литр молока')).toEqual({ title: 'молока', qty: 1, unit: 'l' });
  });

  it('другие единицы, полтора, казахские и английские слова', () => {
    expect(parseBulkPart('яйца десять штук')).toEqual({ title: 'яйца', qty: 10, unit: 'pcs' });
    expect(parseBulkPart('молоко один литр 450 ₸')).toEqual({ title: 'молоко', qty: 1, unit: 'l', price: 450 });
    expect(parseBulkPart('сахар полтора кг')).toEqual({ title: 'сахар', qty: 1.5, unit: 'kg' });
    expect(parseBulkPart('сүт екі литр')).toEqual({ title: 'сүт', qty: 2, unit: 'l' });
    expect(parseBulkPart('rice two pack')).toEqual({ title: 'rice', qty: 2, unit: 'pack' });
  });

  it('слово-число без единицы остаётся в названии', () => {
    expect(parseBulkPart('Три медведя')).toEqual({ title: 'Три медведя', qty: null, unit: null });
    expect(parseBulkPart('Пять звёзд')).toEqual({ title: 'Пять звёзд', qty: null, unit: null });
    expect(parseBulkPart('рис одна')).toEqual({ title: 'рис одна', qty: null, unit: null });
    expect(parseBulkPart('constructor кг')).toEqual({ title: 'constructor кг', qty: null, unit: null });
  });

  it('в списке: каждый товар разбирается отдельно', () => {
    const items = parseBulk('рис одна пачка 500 тенге, хлеб');
    expect(items.map((i) => [i.title, i.qty, i.unit, i.price])).toEqual([['рис', 1, 'pack', 500], ['хлеб', null, null, undefined]]);
  });
});

describe('цена в тексте', () => {
  it('число со значком — цена: ₸, тг, тенге, слитно и раздельно', () => {
    expect(parseBulkPart('хлеб 120 ₸')).toEqual({ title: 'хлеб', qty: null, unit: null, price: 120 });
    expect(parseBulkPart('молоко 1 л 450₸')).toEqual({ title: 'молоко', qty: 1, unit: 'l', price: 450 });
    expect(parseBulkPart('сыр 2 кг 3000 тг')).toEqual({ title: 'сыр', qty: 2, unit: 'kg', price: 3000 });
    expect(parseBulkPart('2 кг сыра 3000 тенге')).toEqual({ title: 'сыра', qty: 2, unit: 'kg', price: 3000 });
    expect(parseBulkPart('хлеб 120 руб.')).toEqual({ title: 'хлеб', qty: null, unit: null, price: 120 });
  });

  it('«за» перед ценой — связка: количество и название не теряются', () => {
    expect(parseBulkPart('Масло 1 кг за 5000 тг')).toEqual({ title: 'Масло', qty: 1, unit: 'kg', price: 5000 });
    expect(parseBulkPart('Масло сливочное 1 кг за 5 000 ₸')).toEqual({ title: 'Масло сливочное', qty: 1, unit: 'kg', price: 5000 });
    expect(parseBulkPart('2 кг сыра за 3000 тенге')).toEqual({ title: 'сыра', qty: 2, unit: 'kg', price: 3000 });
    expect(parseBulkPart('хлеб за 120 ₸')).toEqual({ title: 'хлеб', qty: null, unit: null, price: 120 });
    expect(parseBulkPart('за 120 ₸')).toEqual({ title: 'за', qty: null, unit: null, price: 120 });
  });

  it('группы тысяч и дробная цена', () => {
    expect(parseBulkPart('сыр 2 кг 3 000 ₸')).toEqual({ title: 'сыр', qty: 2, unit: 'kg', price: 3000 });
    expect(parseBulkPart('сок 1,5 л 1 250,50 ₸')).toEqual({ title: 'сок', qty: 1.5, unit: 'l', price: 1250.5 });
  });

  it('число без значка остаётся в названии', () => {
    expect(parseBulkPart('молоко 1 л 450т')).toEqual({ title: 'молоко 1 л 450т', qty: null, unit: null });
    expect(parseBulkPart('Йогурт 3')).toEqual({ title: 'Йогурт 3', qty: null, unit: null });
    expect(parseBulkPart('Молоко 3,2%')).toEqual({ title: 'Молоко 3,2%', qty: null, unit: null });
  });

  it('одна цена без названия — это название', () => {
    expect(parseBulkPart('450 ₸')).toEqual({ title: '450 ₸', qty: null, unit: null });
  });

  it('символ или код валюты пользователя тоже значок цены', () => {
    expect(parseBulkPart('хлеб 5 usd')).toEqual({ title: 'хлеб 5 usd', qty: null, unit: null });
    expect(parseBulkPart('хлеб 5 usd', priceMarkers('USD'))).toEqual({ title: 'хлеб', qty: null, unit: null, price: 5 });
    expect(parseBulkPart('хлеб 5BR', priceMarkers('br'))).toEqual({ title: 'хлеб', qty: null, unit: null, price: 5 });
  });

  it('список с ценами и предпросмотр', () => {
    const items = parseBulk('молоко 1 л 450 ₸, хлеб, сыр 2 кг 3 000 ₸');
    expect(items.map((i) => [i.title, i.price])).toEqual([['молоко', 450], ['хлеб', undefined], ['сыр', 3000]]);
    expect(bulkPreview('молоко 1 л 450 ₸, хлеб')).toHaveLength(2);
    expect(bulkPreview('хлеб 120 ₸')).toHaveLength(1);
    expect(bulkPreview('Молоко')).toEqual([]);
    expect(isStructured(parseBulk('хлеб 120 ₸'))).toBe(true);
  });
});
