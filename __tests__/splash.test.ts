import anim from '@/logic/splashAnimation.json';
import {
  CHECK_PATH,
  PRODUCT_ART,
  PRODUCT_COUNT,
  TOTAL_MS,
  bagAt,
  easeBezier,
  glowAt,
  parseArt,
  productAt,
  shadowAt,
  checkDashOffset,
  textAt,
} from '@/logic/splash';

describe('easeBezier', () => {
  it('концы 0 и 1, линейная кривая не меняет значение', () => {
    expect(easeBezier(0.42, 0, 0.58, 1, 0)).toBe(0);
    expect(easeBezier(0.42, 0, 0.58, 1, 1)).toBe(1);
    expect(easeBezier(0, 0, 1, 1, 0.3)).toBeCloseTo(0.3, 3);
  });

  it('ease-in-out симметрична, «пружинка» выходит за 1', () => {
    expect(easeBezier(0.42, 0, 0.58, 1, 0.5)).toBeCloseTo(0.5, 3);
    expect(easeBezier(0.34, 1.56, 0.64, 1, 0.4)).toBeGreaterThan(1);
  });
});

describe('заставка в момент t = 0', () => {
  it('пакет невидим, продукты за краем, галочки нет', () => {
    expect(bagAt(0).opacity).toBe(0);
    for (let i = 0; i < PRODUCT_COUNT; i++) {
      const p = productAt(i, 0);
      expect(p.x < 0 || p.x > 120).toBe(true);
    }
    expect(checkDashOffset(0)).toBe(71);
    expect(shadowAt(0).opacity).toBe(0);
    expect(glowAt(0).opacity).toBe(0);
    expect(textAt('name', 0).opacity).toBe(0);
  });
});

describe('заставка в момент t = totalMs', () => {
  it('пакет обычного размера и на месте', () => {
    expect(bagAt(TOTAL_MS)).toEqual({ opacity: 1, sx: 1, sy: 1, ty: 0 });
  });

  it('продукты скрыты, тень и свечение погасли', () => {
    for (let i = 0; i < PRODUCT_COUNT; i++) expect(productAt(i, TOTAL_MS).opacity).toBe(0);
    expect(shadowAt(TOTAL_MS).opacity).toBe(0);
    expect(glowAt(TOTAL_MS).opacity).toBe(0);
  });

  it('галочка нарисована полностью', () => {
    expect(CHECK_PATH).toBe(anim.paths.check);
    expect(checkDashOffset(TOTAL_MS)).toBe(0);
  });

  it('все тексты видны (= логотип)', () => {
    for (const id of ['name', 'slogan', 'badge', 'hint'] as const) {
      expect(textAt(id, TOTAL_MS)).toEqual({ opacity: 1, ty: 0 });
    }
  });
});

describe('тайминги', () => {
  it('времена ключевых кадров пакета и тени растут', () => {
    const bag = anim.timeline.bag.keys.map((k) => k.t);
    const shadow = anim.timeline.shadow.keys.map((k) => k.t);
    for (const list of [bag, shadow]) {
      for (let i = 1; i < list.length; i++) expect(list[i]).toBeGreaterThan(list[i - 1]);
    }
  });

  it('этапы идут по порядку: продукты → прыжок → галочка → свечение → конец; улыбки нет', () => {
    const t = anim.timeline;
    const lastFly = Math.max(...t.products.map((p) => p.startMs + p.flyMs));
    const landed = t.bag.keys[t.bag.keys.length - 1].t;
    expect(lastFly).toBeLessThan(landed);
    expect(t.check.startMs).toBeLessThanOrEqual(landed);
    expect(t.check.startMs + t.check.drawMs).toBeLessThanOrEqual(t.glow.startMs + 100);
    expect('smile' in t || 'morph' in t).toBe(false);
    expect(t.glow.startMs + t.glow.ms).toBeLessThanOrEqual(TOTAL_MS);
    expect(t.markDoneMs).toBeLessThanOrEqual(TOTAL_MS);
  });
});

describe('пакет', () => {
  it('прыжок: на 1720 мс пакет поднят на 22, на 1880 — на месте', () => {
    expect(bagAt(1720).ty).toBe(-22);
    expect(bagAt(1880).ty).toBe(0);
  });

  it('между кадрами значения плавно меняются', () => {
    const mid = bagAt(165);
    expect(mid.sx).toBeGreaterThan(0.6);
    expect(mid.sx).toBeLessThan(1.1);
  });
});

describe('продукты', () => {
  it('в середине полёта продукт на высоте apexY, в конце — в точке to', () => {
    anim.timeline.products.forEach((pr, i) => {
      expect(productAt(i, pr.startMs + pr.flyMs / 2).y).toBeCloseTo(pr.apexY, 3);
      const end = productAt(i, pr.startMs + pr.flyMs);
      expect(end.x).toBeCloseTo(pr.to[0], 3);
      expect(end.y).toBeCloseTo(pr.to[1], 3);
      expect(end.rot).toBeCloseTo(pr.rot[1], 3);
    });
  });

  it('до старта продукт в точке from', () => {
    const p0 = anim.timeline.products[1];
    expect(productAt(1, 0)).toMatchObject({ x: p0.from[0], y: p0.from[1], opacity: 1 });
  });

  it('залетают по очереди: яблоко, молоко, багет, морковь', () => {
    expect(anim.timeline.products.map((p) => p.id)).toEqual(['apple', 'milk', 'bread', 'carrot']);
    const starts = anim.timeline.products.map((p) => p.startMs);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

describe('галочка', () => {
  it('рисуется слева направо: смещение падает с 71 до 70 − длина, затем 0', () => {
    const c = anim.timeline.check;
    expect(checkDashOffset(c.startMs)).toBe(71);
    const mid = checkDashOffset(c.startMs + c.drawMs / 2);
    expect(mid).toBeLessThan(71);
    expect(mid).toBeGreaterThan(70 - c.length);
    expect(checkDashOffset(c.startMs + c.drawMs)).toBe(0);
  });

  it('длина в json совпадает с длиной пути галочки (±1)', () => {
    const n = (anim.paths.check.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const len = Math.hypot(n[6] - n[0], n[7] - n[1]) + Math.hypot(n[12] - n[6], n[13] - n[7]);
    expect(Math.abs(len - anim.timeline.check.length)).toBeLessThan(1);
  });
});

describe('свечение и тексты', () => {
  it('свечение вспыхивает и гаснет', () => {
    const g = anim.timeline.glow;
    let peak = 0;
    for (let t = g.startMs; t <= g.startMs + g.ms; t += 20) peak = Math.max(peak, glowAt(t).opacity);
    expect(peak).toBeGreaterThan(0.8);
  });

  it('тексты появляются по очереди; у плашки и подсказки сдвиг 0', () => {
    const starts = anim.timeline.texts.map((x) => x.startMs);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const name = anim.timeline.texts[0].startMs;
    expect(textAt('name', name).opacity).toBe(0);
    expect(textAt('name', name).ty).toBe(10);
    expect(textAt('badge', 2800).ty).toBe(0);
    expect(textAt('hint', 3000).ty).toBe(0);
  });
});

describe('тень', () => {
  it('появляется при приземлении после прыжка', () => {
    expect(shadowAt(1540).opacity).toBeCloseTo(0.12, 3);
    expect(shadowAt(1720).opacity).toBeCloseTo(0.05, 3);
  });
});

describe('рисунки продуктов из json', () => {
  it('parseArt разбирает path / ellipse / rect и переводит атрибуты', () => {
    const els = parseArt('<path d="M0 0" fill="#fff" stroke-width="2"></path> <rect x="1" y="2" width="3" height="4" rx="1"></rect>');
    expect(els).toEqual([
      { tag: 'path', props: { d: 'M0 0', fill: '#fff', strokeWidth: '2' } },
      { tag: 'rect', props: { x: '1', y: '2', width: '3', height: '4', rx: '1' } },
    ]);
  });

  it('у каждого продукта есть элементы с нужным числом частей', () => {
    expect(PRODUCT_ART.map((p) => [p.id, p.elements.length])).toEqual([['apple', 4], ['milk', 9], ['bread', 3], ['carrot', 3]]);
    for (const p of PRODUCT_ART) for (const el of p.elements) expect(['path', 'ellipse', 'rect']).toContain(el.tag);
  });
});
