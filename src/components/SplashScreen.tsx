import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { t } from '@/i18n';
import { SchemeDef, schemeDefs, themeDefaults } from '@/theme';
import { Appearance } from '@/db/appearance';
import { activeSchemeKey, splashSchemeKey } from '@/logic/schemes';
import {
  BAG_ORIGIN,
  GLOW,
  MARK_SIZE_DP,
  MARK_UNITS,
  PATHS,
  PRODUCT_ART,
  PRODUCT_COUNT,
  SHADOW,
  CHECK_PATH,
  TOTAL_MS,
  TextId,
  bagAt,
  glowAt,
  productAt,
  shadowAt,
  checkDashOffset,
  textAt,
} from '@/logic/splash';
import { IS_PROTOTYPE } from '@/config';

const K = MARK_SIZE_DP / MARK_UNITS; // dp на единицу сетки знака
const ART_UNITS = 70; // сторона квадрата рисунка продукта (в единицах сетки)
const BACK_R = 170; // радиус слоя свечения и тени, dp

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Props = {
  appearance: Appearance | null;
  onShown: () => void; // первый кадр с цветами профиля нарисован — можно скрыть нативную заставку
  onFinished: () => void; // заставка закончилась: по окончании анимации / касанию (в прототипе — касанию после финала)
};

// Живая заставка: продукты по очереди залетают в пакет, пакет растёт, прыгает, приземляется — рисуется галочка → тексты.
// Тайминги и геометрия — src/logic/splashAnimation.json. До загрузки настроек показывается только фон.
export function SplashScreen({ appearance, onShown, onFinished }: Props) {
  const system = useColorScheme();
  if (!appearance) {
    const def = schemeDefs[activeSchemeKey(themeDefaults.schemeSetting, system)];
    return <View style={[styles.root, { backgroundColor: def.tokens.bg }]} />;
  }
  // Заставка всегда фирменная: «Янтарь» при светлой теме телефона, «Какао» при тёмной — какой бы профиль ни был выбран.
  const def = schemeDefs[splashSchemeKey(system)];
  return <LiveSplash def={def} onShown={onShown} onFinished={onFinished} />;
}

type LiveProps = { def: SchemeDef; onShown: () => void; onFinished: () => void };

function LiveSplash({ def, onShown, onFinished }: LiveProps) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const time = useSharedValue(reduced ? TOTAL_MS : 0);
  const [done, setDone] = useState(reduced);

  // Время — один shared value; всё остальное считается из него на UI-потоке.
  useEffect(() => {
    if (reduced) return;
    time.set(withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear }));
    const timer = setTimeout(() => setDone(true), TOTAL_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimation(time);
    };
  }, [reduced, time]);

  // Без прототипа заставка закрывается сама, когда анимация закончилась (или после касания).
  useEffect(() => {
    if (done && !IS_PROTOTYPE) onFinished();
  }, [done, onFinished]);

  const onPress = () => {
    if (!done) {
      // касание во время анимации — сразу финальный кадр
      cancelAnimation(time);
      time.set(TOTAL_MS);
      setDone(true);
    } else if (IS_PROTOTYPE) {
      onFinished();
    }
  };

  const cx = width / 2;
  const cy = height / 2 - 80; // центр знака на экране
  const tk = def.tokens;
  const markBox = { position: 'absolute' as const, left: cx - MARK_SIZE_DP / 2, top: cy - MARK_SIZE_DP / 2, width: MARK_SIZE_DP, height: MARK_SIZE_DP };

  return (
    <Pressable
      style={[styles.root, { backgroundColor: tk.bg }]}
      onPress={onPress}
      onLayout={onShown}
      accessibilityRole="button"
      accessibilityLabel={t('splash.continue')}
    >
      <BackLayer def={def} time={time} cx={cx} cy={cy} />
      <Bag box={markBox} time={time}>
        <Svg width={MARK_SIZE_DP} height={MARK_SIZE_DP} viewBox={`0 0 ${MARK_UNITS} ${MARK_UNITS}`}>
          <Defs>
            <LinearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={def.mark.from} />
              <Stop offset="1" stopColor={def.mark.to} />
            </LinearGradient>
          </Defs>
          <Path d={PATHS.handle.d} fill="none" stroke="url(#hg)" strokeWidth={PATHS.handle.strokeWidth} strokeLinecap="round" />
        </Svg>
      </Bag>
      {Array.from({ length: PRODUCT_COUNT }, (_, i) => (
        <Product key={i} index={i} time={time} cx={cx} cy={cy} />
      ))}
      <Bag box={markBox} time={time}>
        <BagBody def={def} time={time} />
      </Bag>
      <View style={[styles.texts, { top: cy + MARK_SIZE_DP / 2 + 24 }]} pointerEvents="none">
        <Fade id="name" time={time}>
          <Text style={[styles.name, { color: tk.text }]}>{t('splash.name')}</Text>
        </Fade>
        <Fade id="slogan" time={time}>
          <Text style={[styles.slogan, { color: tk.textMuted }]}>{t('splash.slogan')}</Text>
        </Fade>
        {IS_PROTOTYPE ? (
          <Fade id="badge" time={time}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('proto.badge')}</Text>
            </View>
          </Fade>
        ) : null}
      </View>
      {IS_PROTOTYPE ? (
        <View style={styles.hintBox} pointerEvents="none">
          <Fade id="hint" time={time}>
            <Text style={[styles.hint, { color: tk.textMuted }]}>{t('splash.continue')}</Text>
          </Fade>
        </View>
      ) : null}
    </Pressable>
  );
}

// Слой под пакетом: свечение и тень (шире знака, поэтому свой холст).
function BackLayer({ def, time, cx, cy }: { def: SchemeDef; time: SharedValue<number>; cx: number; cy: number }) {
  const extent = (BACK_R * 2) / K; // сторона холста в единицах сетки
  const min = MARK_UNITS / 2 - extent / 2;
  const glowCx = GLOW.center[0];
  const glowProps = useAnimatedProps(() => {
    const g = glowAt(time.value);
    return { r: GLOW.r * g.scale, opacity: g.opacity };
  });
  const shadowProps = useAnimatedProps(() => {
    const s = shadowAt(time.value);
    return { rx: SHADOW.radius[0] * s.sx, opacity: s.opacity };
  });
  return (
    <View style={{ position: 'absolute', left: cx - BACK_R, top: cy - BACK_R, width: BACK_R * 2, height: BACK_R * 2 }} pointerEvents="none">
      <Svg width={BACK_R * 2} height={BACK_R * 2} viewBox={`${min} ${min} ${extent} ${extent}`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={def.mark.from} stopOpacity={GLOW.stopOpacity[0]} />
            <Stop offset="1" stopColor={def.mark.from} stopOpacity={GLOW.stopOpacity[1]} />
          </RadialGradient>
        </Defs>
        <AnimatedCircle cx={glowCx} cy={GLOW.center[1]} fill="url(#glow)" animatedProps={glowProps} />
        <AnimatedEllipse
          cx={SHADOW.center[0]}
          cy={SHADOW.center[1]}
          ry={SHADOW.radius[1]}
          fill={def.tokens.text}
          animatedProps={shadowProps}
        />
      </Svg>
    </View>
  );
}

// Трансформация пакета: translate(0, ty) · scale(sx, sy) относительно низа пакета; общая для ручки и корпуса.
function Bag({ box, time, children }: { box: object; time: SharedValue<number>; children: React.ReactNode }) {
  const originY = `${(BAG_ORIGIN[1] / MARK_UNITS) * 100}%` as const;
  const style = useAnimatedStyle(() => {
    const b = bagAt(time.value);
    return { opacity: b.opacity, transform: [{ translateY: b.ty * K }, { scaleX: b.sx }, { scaleY: b.sy }] };
  });
  return (
    <Animated.View style={[box, { transformOrigin: ['50%', originY] }, style]} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

// Корпус: градиент профиля, блик сверху, галочка линией цвета фона (выглядит как вырез логотипа) — рисуется слева направо.
function BagBody({ def, time }: { def: SchemeDef; time: SharedValue<number> }) {
  const shine = PATHS.shine.rect;
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: checkDashOffset(time.value) }));
  return (
    <Svg width={MARK_SIZE_DP} height={MARK_SIZE_DP} viewBox={`0 0 ${MARK_UNITS} ${MARK_UNITS}`}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={def.mark.from} />
          <Stop offset="1" stopColor={def.mark.to} />
        </LinearGradient>
        <LinearGradient id="sh" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id="bc">
          <Path d={PATHS.body} />
        </ClipPath>
      </Defs>
      <Path d={PATHS.body} fill="url(#bg)" />
      <Rect x={shine[0]} y={shine[1]} width={shine[2]} height={shine[3]} fill="url(#sh)" clipPath="url(#bc)" />
      <AnimatedPath
        d={CHECK_PATH}
        fill="none"
        stroke={def.tokens.bg}
        strokeWidth={PATHS.checkStroke.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[70, 90]}
        strokeDashoffset={71}
        animatedProps={checkProps}
      />
    </Svg>
  );
}

// Продукт: летит по дуге и вращается; рисунок разобран из json (одинаковый во всех профилях).
function Product({ index, time, cx, cy }: { index: number; time: SharedValue<number>; cx: number; cy: number }) {
  const art = PRODUCT_ART[index];
  const size = ART_UNITS * K;
  const style = useAnimatedStyle(() => {
    const p = productAt(index, time.value);
    return {
      opacity: p.opacity,
      transform: [{ translateX: (p.x - MARK_UNITS / 2) * K }, { translateY: (p.y - MARK_UNITS / 2) * K }, { rotate: `${p.rot}deg` }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox={`${-ART_UNITS / 2} ${-ART_UNITS / 2} ${ART_UNITS} ${ART_UNITS}`}>
        <G scale={art.scale}>
          {art.elements.map((el, i) => {
            const common = el.props as Record<string, string>;
            if (el.tag === 'ellipse') return <Ellipse key={i} {...common} />;
            if (el.tag === 'rect') return <Rect key={i} {...common} />;
            return <Path key={i} {...common} />;
          })}
        </G>
      </Svg>
    </Animated.View>
  );
}

// Текст: opacity 0 → 1 и сдвиг вверх.
function Fade({ id, time, children }: { id: TextId; time: SharedValue<number>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const s = textAt(id, time.value);
    return { opacity: s.opacity, transform: [{ translateY: s.ty }] };
  });
  return <Animated.View style={[styles.fade, style]}>{children}</Animated.View>;
}


const styles = StyleSheet.create({
  root: { flex: 1 },
  texts: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  fade: { alignItems: 'center' },
  name: { fontSize: 28, fontWeight: '700' },
  slogan: { fontSize: 15 },
  badge: { backgroundColor: '#FAC775', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  badgeText: { color: '#412402', fontSize: 12, fontWeight: '700' },
  hintBox: { position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center' },
  hint: { fontSize: 14 },
});
