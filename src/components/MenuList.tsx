import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing } from '../theme/system';
import { SystemText } from './system';

export type MenuItem = {
  icon: string;              // nombre de Ionicons
  label: string;
  value?: string;            // texto a la derecha (opcional)
  onPress: () => void;
  iconColor?: string;
  danger?: boolean;
  hideChevron?: boolean;
};

/** Una fila de menú: icono + label + (valor) + chevron */
export function MenuRow({ item, isLast }: { item: MenuItem; isLast?: boolean }) {
  const tint = item.danger ? colors.danger : (item.iconColor ?? colors.glow);
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && { backgroundColor: colors.bgElevated },
      ]}
    >
      <View style={[styles.iconBubble, { backgroundColor: tint + '1A' }]}>
        <Ionicons name={item.icon as any} size={18} color={tint} />
      </View>
      <SystemText style={[styles.label, item.danger && { color: colors.danger }]}>
        {item.label}
      </SystemText>
      {item.value ? (
        <SystemText dim style={styles.value}>
          {item.value}
        </SystemText>
      ) : null}
      {!item.hideChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

/** Sección agrupada de filas con título opcional */
export function MenuList({ title, items }: { title?: string; items: MenuItem[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {items.map((item, i) => (
          <MenuRow key={item.label} item={item} isLast={i === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
    color: colors.textFaint, marginLeft: 4,
  },
  card: {
    backgroundColor: colors.panel, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 13,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder },
  iconBubble: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  value: { fontSize: 13, maxWidth: 130, marginRight: 4 },
});
