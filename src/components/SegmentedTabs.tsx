import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/system';
import { SystemText } from './system';

export function SegmentedTabs<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.tab, active && styles.tabActive]}>
            <SystemText style={[styles.label, { color: active ? colors.text : colors.textDim }]}>
              {opt.label}
            </SystemText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: radius.pill, padding: 3, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelBorder },
  label: { fontSize: 13, fontWeight: '700' },
});
