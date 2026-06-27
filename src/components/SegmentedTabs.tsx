import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/system';
import { SystemText } from './system';

export function SegmentedTabs<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map(opt => {
        const active = opt.key === value;
        const tint = active ? colors.text : colors.textDim;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.tab, active && styles.tabActive]}>
            {opt.icon && <Ionicons name={opt.icon} size={14} color={tint} />}
            <SystemText style={[styles.label, { color: tint }]}>{opt.label}</SystemText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: radius.pill, padding: 3, gap: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelBorder },
  label: { fontSize: 13, fontWeight: '700' },
});
