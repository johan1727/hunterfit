import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useHunterData } from '../../hooks/useHunterData';
import { getAllBadges, getUserBadges, type Badge, type UserBadge } from '../../services/badges';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel, SystemText,
} from '../../components/system';
import { EmptyState } from '../../components/EmptyState';
import { EMPTY_STATES } from '../../lib/emptyState';
import { colors, gradients, radius, spacing } from '../../theme/system';

const RARITY_COLORS = {
  legendary: '#FFD700',
  epic: '#A855F7',
  rare: '#3B82F6',
  common: colors.textDim,
};

const RARITY_BG = {
  legendary: '#FFD70015',
  epic: '#A855F715',
  rare: '#3B82F615',
  common: colors.bgElevated,
};

const RARITY_LABEL = {
  legendary: 'Legendario',
  epic: 'Épico',
  rare: 'Raro',
  common: 'Común',
};

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  all:       { label: 'Todos',     icon: 'ribbon-outline' },
  workout:   { label: 'Entreno',   icon: 'barbell-outline' },
  nutrition: { label: 'Nutrición', icon: 'nutrition-outline' },
  streak:    { label: 'Rachas',    icon: 'flame-outline' },
  level:     { label: 'Nivel',     icon: 'flash-outline' },
  social:    { label: 'Social',    icon: 'trophy-outline' },
};

export default function BadgesScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { isDemo } = useHunterData();
  const [category, setCategory] = useState('all');

  const { data: allBadges = [] } = useQuery<Badge[]>({
    queryKey: ['all_badges'],
    staleTime: Infinity,
    queryFn: getAllBadges,
  });

  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: ['user_badges', userId],
    enabled: !!userId && !isDemo,
    queryFn: () => getUserBadges(userId!),
  });

  const earnedIds = new Set(userBadges.map((ub) => ub.badge_id));
  const earnedCount = userBadges.length;
  const totalCount = allBadges.length;
  const progress = totalCount > 0 ? earnedCount / totalCount : 0;

  const filtered = category === 'all'
    ? allBadges
    : allBadges.filter((b) => b.category === category);

  const earnedFiltered = filtered.filter((b) => earnedIds.has(b.id));
  const lockedFiltered = filtered.filter((b) => !earnedIds.has(b.id));

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
          </Pressable>
          <GradientText style={{ fontSize: 28, fontWeight: '900' }}>Logros</GradientText>
        </View>

        {/* Progress panel */}
        <SystemWindowPanel style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <GradientText style={{ fontSize: 36, fontWeight: '900' }}>{earnedCount}</GradientText>
              <SystemText dim style={{ fontSize: 13 }}>de {totalCount} logros</SystemText>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {(['legendary', 'epic', 'rare'] as const).map((r) => {
                const count = userBadges.filter((ub) => {
                  const b = allBadges.find((x) => x.id === ub.badge_id);
                  return b?.rarity === r;
                }).length;
                return count > 0 ? (
                  <View key={r} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[r] }]} />
                    <SystemText style={{ fontSize: 13, color: RARITY_COLORS[r], fontWeight: '700' }}>
                      {count} {RARITY_LABEL[r]}
                    </SystemText>
                  </View>
                ) : null;
              })}
            </View>
          </View>
          {/* barra de progreso */}
          <View style={styles.progressBar}>
            <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <SystemText dim style={{ fontSize: 12, textAlign: 'right' }}>
            {Math.round(progress * 100)}% completado
          </SystemText>
        </SystemWindowPanel>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
            {Object.entries(CATEGORY_META).map(([cat, meta]) => {
              const active = category === cat;
              return (
                <Pressable key={cat} onPress={() => setCategory(cat)}>
                  {active ? (
                    <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.catChipGrad, styles.catChipRow]}>
                      <Ionicons name={meta.icon} size={13} color="#fff" />
                      <SystemText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{meta.label}</SystemText>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.catChip, styles.catChipRow]}>
                      <Ionicons name={meta.icon} size={13} color={colors.textDim} />
                      <SystemText dim style={{ fontSize: 13 }}>{meta.label}</SystemText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {userBadges.length === 0 ? (
          <EmptyState
            {...EMPTY_STATES.badges}
            cta={{ label: 'Ver misiones', onPress: () => router.push('/(tabs)/home') }}
          />
        ) : (
          <>
            {/* Earned */}
            {earnedFiltered.length > 0 && (
              <>
                <SystemText style={{ fontWeight: '700', fontSize: 14, color: '#4AE3B5' }}>
                  ✅ Obtenidos ({earnedFiltered.length})
                </SystemText>
                <View style={styles.grid}>
                  {earnedFiltered.map((badge) => {
                    const ub = userBadges.find((u) => u.badge_id === badge.id);
                    return (
                      <BadgeCard key={badge.id} badge={badge} earned earnedAt={ub?.earned_at} />
                    );
                  })}
                </View>
              </>
            )}

            {/* Locked */}
            {lockedFiltered.length > 0 && (
              <>
                <SystemText style={{ fontWeight: '700', fontSize: 14, color: colors.textDim }}>
                  🔒 Por obtener ({lockedFiltered.length})
                </SystemText>
                <View style={styles.grid}>
                  {lockedFiltered.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} earned={false} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BadgeCard({ badge, earned, earnedAt }: { badge: Badge; earned: boolean; earnedAt?: string }) {
  const rarityColor = RARITY_COLORS[badge.rarity];
  const rarityBg = RARITY_BG[badge.rarity];
  const date = earnedAt ? new Date(earnedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : null;

  return (
    <View style={[styles.badgeCard,
      { borderColor: earned ? rarityColor + '60' : colors.panelBorder, backgroundColor: earned ? rarityBg : colors.bgElevated + '80' },
    ]}>
      <SystemText style={[styles.badgeIcon, !earned && { opacity: 0.3 }]}>{badge.icon}</SystemText>
      <SystemText style={[styles.badgeName, !earned && { opacity: 0.5 }]} numberOfLines={2}>
        {badge.name_es}
      </SystemText>
      <SystemText dim style={[styles.badgeDesc, !earned && { opacity: 0.4 }]} numberOfLines={2}>
        {badge.description_es}
      </SystemText>
      {earned ? (
        <View style={[styles.rarityPill, { backgroundColor: rarityColor + '20' }]}>
          <SystemText style={{ fontSize: 10, fontWeight: '700', color: rarityColor }}>
            {RARITY_LABEL[badge.rarity].toUpperCase()}
          </SystemText>
        </View>
      ) : (
        <SystemText dim style={{ fontSize: 10 }}>🔒 Bloqueado</SystemText>
      )}
      {date && (
        <SystemText dim style={{ fontSize: 10, marginTop: 2 }}>{date}</SystemText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  progressBar: {
    height: 8, backgroundColor: colors.bgElevated,
    borderRadius: radius.pill, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.panelBorder,
  },
  catChipGrad: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  catChipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: {
    width: '47%', borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.sm, alignItems: 'center', gap: 4,
  },
  badgeIcon: { fontSize: 36 },
  badgeName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
  rarityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
