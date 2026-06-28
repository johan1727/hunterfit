import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { checkAndAwardBadges } from '../../services/badges';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel,
  SystemText, RankBadge,
} from '../../components/system';
import { EmptyState } from '../../components/EmptyState';
import { EMPTY_STATES } from '../../lib/emptyState';
import { colors, gradients, radius, rankColors, spacing } from '../../theme/system';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  rank: string;
  level: number;
  xp: number;
  streak_days: number;
  badge_count: number;
}

const RARITY_COLORS = {
  legendary: '#FFD700',
  epic: '#A855F7',
  rare: '#3B82F6',
  common: colors.textDim,
};

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { userId } = useAuth();

  const { data: entries = [], isLoading, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_n: 50 });
      if (error) throw error;
      const list = (data ?? []) as LeaderboardEntry[];
      if (userId) {
        const pos = list.findIndex((e) => e.user_id === userId) + 1;
        if (pos > 0) {
          const me = list.find((e) => e.user_id === userId);
          void checkAndAwardBadges(userId, {
            leaderboardPosition: pos,
            level: me?.level ?? 1,
            rank: me?.rank ?? 'E',
          });
        }
      }
      return list;
    },
  });

  const myPosition = entries.findIndex((e) => e.user_id === userId) + 1;
  const myEntry = entries.find((e) => e.user_id === userId);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
          </Pressable>
          <GradientText style={{ fontSize: 28, fontWeight: '900' }}>Leaderboard</GradientText>
        </View>

        {/* Mi posición */}
        {myEntry && (
          <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.myPositionWrap}>
            <View style={{ flex: 1 }}>
              <SystemText style={{ fontWeight: '900', fontSize: 13, color: '#fff', opacity: 0.8 }}>
                TU POSICIÓN
              </SystemText>
              <SystemText style={{ fontWeight: '900', fontSize: 22, color: '#fff' }}>
                #{myPosition} — {myEntry.username}
              </SystemText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <SystemText style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {myEntry.xp.toLocaleString('es')} XP
              </SystemText>
              <SystemText style={{ color: '#fff', opacity: 0.8, fontSize: 13 }}>
                Lv. {myEntry.level} · {myEntry.rank}
              </SystemText>
            </View>
          </LinearGradient>
        )}

        {entries.length === 0 ? (
          <EmptyState
            {...EMPTY_STATES.leaderboard}
            cta={{ label: 'Ir al inicio', onPress: () => router.replace('/(tabs)/home') }}
          />
        ) : (
          <>
            {/* Podio top 3 */}
            {top3.length >= 3 && (
              <View style={styles.podiumRow}>
                {/* 2do */}
                <View style={[styles.podiumCard, { marginTop: 24 }]}>
                  <SystemText style={{ fontSize: 28 }}>🥈</SystemText>
                  <SystemText style={{ fontWeight: '800', fontSize: 13, color: PODIUM_COLORS[1] }}>
                    #{2}
                  </SystemText>
                  <SystemText style={{ fontWeight: '700', fontSize: 12, color: colors.text }} numberOfLines={1}>
                    {top3[1]?.username}
                  </SystemText>
                  <SystemText dim style={{ fontSize: 11 }}>Lv.{top3[1]?.level}</SystemText>
                  <SystemText style={{ fontSize: 12, fontWeight: '800', color: PODIUM_COLORS[1] }}>
                    {top3[1]?.xp.toLocaleString('es')}
                  </SystemText>
                </View>
                {/* 1ro */}
                <View style={[styles.podiumCard, styles.podiumFirst]}>
                  <SystemText style={{ fontSize: 36 }}>🥇</SystemText>
                  <SystemText style={{ fontWeight: '900', fontSize: 15, color: PODIUM_COLORS[0] }}>
                    #1
                  </SystemText>
                  <SystemText style={{ fontWeight: '700', fontSize: 13, color: colors.text }} numberOfLines={1}>
                    {top3[0]?.username}
                  </SystemText>
                  <SystemText dim style={{ fontSize: 12 }}>Lv.{top3[0]?.level}</SystemText>
                  <SystemText style={{ fontSize: 13, fontWeight: '900', color: PODIUM_COLORS[0] }}>
                    {top3[0]?.xp.toLocaleString('es')} XP
                  </SystemText>
                </View>
                {/* 3ro */}
                <View style={[styles.podiumCard, { marginTop: 36 }]}>
                  <SystemText style={{ fontSize: 24 }}>🥉</SystemText>
                  <SystemText style={{ fontWeight: '800', fontSize: 13, color: PODIUM_COLORS[2] }}>
                    #{3}
                  </SystemText>
                  <SystemText style={{ fontWeight: '700', fontSize: 12, color: colors.text }} numberOfLines={1}>
                    {top3[2]?.username}
                  </SystemText>
                  <SystemText dim style={{ fontSize: 11 }}>Lv.{top3[2]?.level}</SystemText>
                  <SystemText style={{ fontSize: 12, fontWeight: '800', color: PODIUM_COLORS[2] }}>
                    {top3[2]?.xp.toLocaleString('es')}
                  </SystemText>
                </View>
              </View>
            )}

            {/* Lista del 4 en adelante */}
            {isLoading ? (
              <SystemText dim style={{ textAlign: 'center', marginTop: 40 }}>Cargando ranking...</SystemText>
            ) : (
              <View style={{ gap: spacing.xs }}>
                {rest.map((entry, i) => {
                  const pos = i + 4;
                  const isMe = entry.user_id === userId;
                  return (
                    <SystemPanel key={entry.user_id}
                      style={[styles.entryRow, isMe && styles.entryRowMe]}>
                      <SystemText style={[styles.pos, isMe && { color: gradients.brand[0] }]}>
                        #{pos}
                      </SystemText>
                      <View style={styles.rankDot}>
                        <SystemText style={{ fontSize: 13, fontWeight: '700',
                          color: rankColors[entry.rank as keyof typeof rankColors] ?? colors.textDim }}>
                          {entry.rank}
                        </SystemText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <SystemText style={{ fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                          {entry.username}{isMe ? ' (tú)' : ''}
                        </SystemText>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                          <SystemText dim style={{ fontSize: 12 }}>Lv.{entry.level}</SystemText>
                          {entry.streak_days > 0 && (
                            <SystemText dim style={{ fontSize: 12 }}>🔥{entry.streak_days}d</SystemText>
                          )}
                          {entry.badge_count > 0 && (
                            <SystemText dim style={{ fontSize: 12 }}>🏅{entry.badge_count}</SystemText>
                          )}
                        </View>
                      </View>
                      <SystemText style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>
                        {entry.xp.toLocaleString('es')}
                        <SystemText dim style={{ fontSize: 11 }}> XP</SystemText>
                      </SystemText>
                    </SystemPanel>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  myPositionWrap: {
    borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  podiumRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', alignItems: 'flex-end' },
  podiumCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
  },
  podiumFirst: {
    borderColor: '#FFD70040',
    backgroundColor: '#FFD70008',
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  entryRowMe: { borderColor: gradients.brand[0] + '60' },
  pos: { width: 32, fontWeight: '800', fontSize: 14, color: colors.textDim, textAlign: 'center' },
  rankDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.panelBorder,
    alignItems: 'center', justifyContent: 'center',
  },
});
