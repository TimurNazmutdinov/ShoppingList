import { useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { MarkColors } from '@/theme';

// Знак «пакет с галочкой»: ручка-петля, корпус, галочка вырезана маской, блик сверху.
// Геометрия — как в design/logo-palettes.html (сетка 120×120).
const BODY = 'M27 40 H93 Q95 40 95.5 43 L90.5 94 Q90 101 83 101 H37 Q30 101 29.5 94 L24.5 43 Q25 40 27 40 Z';
const HANDLE = 'M45 47 C45 12 75 12 75 47';
const CHECK = 'M44 71 L55.5 82.5 L77 58';

type Props = { size: number; colors: MarkColors };

export function LogoMark({ size, colors }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const grad = `g${id}`;
  const clip = `c${id}`;
  const mask = `m${id}`;
  const shine = `s${id}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.from} />
          <Stop offset="1" stopColor={colors.to} />
        </LinearGradient>
        <LinearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={clip}>
          <Path d={BODY} />
        </ClipPath>
        <Mask id={mask}>
          <Rect width="120" height="120" fill="#FFFFFF" />
          <Path d={CHECK} fill="none" stroke="#000000" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        </Mask>
      </Defs>
      <G transform="translate(0 1)">
        <Path d={HANDLE} fill="none" stroke={`url(#${grad})`} strokeWidth={7} strokeLinecap="round" />
        <G mask={`url(#${mask})`}>
          <Path d={BODY} fill={`url(#${grad})`} />
          <Rect x={20} y={40} width={80} height={34} fill={`url(#${shine})`} clipPath={`url(#${clip})`} />
        </G>
      </G>
    </Svg>
  );
}
