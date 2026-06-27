import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, gradients } from '../theme/system';

interface Props {
  consumed: number;
  target: number;
  size?: number;
}

export function CalorieRing({ consumed, target, size = 160 }: Props) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / Math.max(target, 1), 1);
  const dash = pct * circumference;
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={gradients.brand[0]} />
            <Stop offset="100%" stopColor={gradients.brand[2] ?? gradients.brand[1]} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.panelBorder} strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Halo neón (bloom difuso bajo el arco; oculto en sobreconsumo) */}
        {!over && dash > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={colors.glow}
            strokeWidth={strokeWidth + 8}
            fill="none"
            opacity={0.3}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={over ? colors.danger : 'url(#ring)'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Centro */}
      <View style={styles.center}>
        <Text style={[styles.kcal, over && { color: colors.danger }]}>{consumed}</Text>
        <Text style={styles.label}>kcal</Text>
        <Text style={[styles.sub, over && { color: colors.danger }]}>
          {over ? `+${consumed - target} extra` : `${remaining} restantes`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 2 },
  kcal: { fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  label: { fontSize: 12, color: colors.textFaint, fontWeight: '500' },
  sub: { fontSize: 11, color: colors.textDim, marginTop: 2 },
});
