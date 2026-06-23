import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBadgeStore } from '../lib/badgeStore';
import { SystemText } from './system';
import { colors, gradients, radius, spacing } from '../theme/system';
import type { Badge } from '../services/badges';

const RARITY_COLORS: Record<string, [string, string]> = {
  legendary: ['#FFD700', '#FF8C00'],
  epic:      ['#A855F7', '#6B21A8'],
  rare:      ['#3B82F6', '#1D4ED8'],
  common:    ['#4AE3B5', '#2563EB'],
};

const RARITY_LABEL: Record<string, string> = {
  legendary: '👑 LEGENDARIO',
  epic:      '💫 ÉPICO',
  rare:      '⭐ RARO',
  common:    '✦ COMÚN',
};

const AUTO_DISMISS_MS = 3500;

export function BadgeToast() {
  const insets = useSafeAreaInsets();
  const queue = useBadgeStore((s) => s.queue);
  const dequeue = useBadgeStore((s) => s.dequeue);

  const badge = queue[0] ?? null;

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    translateY.value = withTiming(-120, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(0.9, { duration: 300 });
    setTimeout(dequeue, 320);
  };

  useEffect(() => {
    if (!badge) return;
    // Entrada
    translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [badge?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!badge) return null;

  const rarityColors = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common;

  return (
    <Animated.View style={[styles.container, { top: insets.top + 12 }, animStyle]}>
      <Pressable onPress={() => { if (timerRef.current) clearTimeout(timerRef.current); dismiss(); }}>
        <LinearGradient
          colors={rarityColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.inner}>
            {/* Icono */}
            <View style={styles.iconWrap}>
              <SystemText style={{ fontSize: 36 }}>{badge.icon}</SystemText>
            </View>
            {/* Texto */}
            <View style={{ flex: 1, gap: 2 }}>
              <SystemText style={[styles.rarityLabel, { color: rarityColors[0] }]}>
                {RARITY_LABEL[badge.rarity]} DESBLOQUEADO
              </SystemText>
              <SystemText style={styles.badgeName}>{badge.name_es}</SystemText>
              <SystemText style={styles.badgeDesc} numberOfLines={1}>
                {badge.description_es}
              </SystemText>
            </View>
            {/* XP */}
            {badge.xp_reward > 0 && (
              <View style={styles.xpBadge}>
                <SystemText style={styles.xpText}>+{badge.xp_reward}</SystemText>
                <SystemText style={styles.xpLabel}>XP</SystemText>
              </View>
            )}
          </View>
          {/* Progress bar auto-dismiss */}
          <Animated.View style={styles.progressBarWrap}>
            <AutoDismissBar duration={AUTO_DISMISS_MS} color={rarityColors[0]} key={badge.id} />
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function AutoDismissBar({ duration, color }: { duration: number; color: string }) {
  const width = useSharedValue(100);

  useEffect(() => {
    width.value = withTiming(0, { duration });
  }, []);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%` as any,
    height: 3,
    backgroundColor: color + '80',
    borderRadius: radius.pill,
  }));

  return <Animated.View style={style} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  gradient: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: `${colors.bg}D0`,
  },
  iconWrap: {
    width: 52, height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  rarityLabel: {
    fontSize: 10, fontWeight: '900', letterSpacing: 0.5,
  },
  badgeName: {
    fontSize: 15, fontWeight: '900', color: colors.text,
  },
  badgeDesc: {
    fontSize: 12, color: colors.textDim,
  },
  xpBadge: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  xpText: { fontSize: 16, fontWeight: '900', color: '#4AE3B5' },
  xpLabel: { fontSize: 10, color: colors.textDim },
  progressBarWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
});
