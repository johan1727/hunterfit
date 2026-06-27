import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, numeric, spacing } from '../theme/system';
import { GradientText, SystemText } from './system';

/**
 * HeroStat — readout dominante del "Sistema": label micro-caps + número enorme
 * (numeral tabular, relleno de gradiente) + unidad pequeña al lado.
 */
export function HeroStat({ value, unit, label, size = 64 }: {
  value: string | number;
  unit?: string;
  label: string;
  size?: number;
}) {
  return (
    <View style={styles.wrap}>
      <SystemText dim style={styles.label}>{label}</SystemText>
      <View style={styles.valueRow}>
        <GradientText style={[styles.value, numeric, { fontSize: size, lineHeight: size + 2 }]}>
          {String(value)}
        </GradientText>
        {unit ? <SystemText dim style={styles.unit}>{unit}</SystemText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  label: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  value: { fontWeight: '900', letterSpacing: -2 },
  unit: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
});
