import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useCharacters, useUpdateProfile } from '../../hooks/useData';
import { characterImage, characterFullImage, CHARS_WITH_ART } from '../../constants/game';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemPanel,
  SystemWindowPanel,
  SystemText,
  SystemButton,
  ProgressBar,
} from '../../components/system';

const ARCHETYPE_ICONS: Record<string, string> = {
  masa: '⚔️', definicion: '🗡️', agilidad: '💨',
  movilidad: '🌊', fuerza: '🛡️', general: '⭐',
};

export default function CharacterSelectScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const updateProfile = useUpdateProfile(userId);
  const { data: characters = [], isLoading } = useCharacters();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = characters.find((c) => c.id === selectedId);

  async function handleConfirm() {
    if (!selectedId) return;
    await updateProfile.mutateAsync({ active_character_id: selectedId });
    router.push('/onboarding/body-photo');
  }

  function selectChar(id: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(id);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={styles.loadingWrap}>
          <SystemText dim>Invocando cazadores…</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <Pill dotColor={gradients.brand[1]}>Selección de personaje</Pill>
          <GradientText
            colors={[gradients.brand[1], gradients.brand[2]] as [string, string]}
            style={styles.title}
          >
            Elige tu{'\n'}Cazador
          </GradientText>
          <SystemText dim style={{ fontSize: 14 }}>
            Tu personaje define el enfoque de tus rutinas.
          </SystemText>
        </Animated.View>

        {/* Grid 2 columnas */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.grid}>
          {characters.map((char) => {
            const isSelected = char.id === selectedId;
            const icon = ARCHETYPE_ICONS[char.archetype] ?? '⚔️';

            return (
              <Pressable
                key={char.id}
                style={styles.gridCell}
                onPress={() => selectChar(char.id)}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={gradients.brand as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                  >
                    <View style={[styles.card, styles.cardSelected]}>
                      {CHARS_WITH_ART.has(char.slug) ? (
                        <View style={styles.charImgBox}>
                          <Image source={characterImage(char.slug, 'E')} style={styles.charImg} resizeMode="cover" />
                        </View>
                      ) : (
                        <Text style={styles.cardIcon}>{icon}</Text>
                      )}
                      <GradientText
                        colors={[gradients.brand[0], gradients.brand[2]] as [string, string]}
                        style={styles.cardName}
                      >
                        {char.name}
                      </GradientText>
                      <SystemText dim style={styles.cardTitle}>{char.title}</SystemText>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.card, styles.cardNormal]}>
                    {CHARS_WITH_ART.has(char.slug) ? (
                      <View style={styles.charImgBox}>
                        <Image source={characterImage(char.slug, 'E')} style={styles.charImg} resizeMode="cover" />
                      </View>
                    ) : (
                      <Text style={styles.cardIcon}>{icon}</Text>
                    )}
                    <Text style={styles.cardNameDim}>{char.name}</Text>
                    <SystemText dim style={styles.cardTitle}>{char.title}</SystemText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Detalle del personaje seleccionado */}
        {selected ? (
          <Animated.View entering={FadeInDown.delay(0).springify()} key={selected.id}>
            <SystemWindowPanel style={styles.detailCard}>
              {/* Imagen completa del personaje */}
              {CHARS_WITH_ART.has(selected.slug) && (
                <Image
                  source={characterFullImage(selected.slug)}
                  style={styles.detailImg}
                  resizeMode="contain"
                />
              )}
              {/* Cabecera */}
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <GradientText style={styles.detailName}>{selected.name}</GradientText>
                  <SystemText dim style={{ fontSize: 13, marginTop: 4 }}>{selected.title}</SystemText>
                </View>
                <View style={styles.statsGrid}>
                  {Object.entries(selected.attributes).map(([k, v]) => (
                    <View key={k} style={styles.statCell}>
                      <Text style={styles.statLabel}>{k.toUpperCase()}</Text>
                      <Text style={styles.statValue}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <SystemText dim style={{ fontSize: 14, lineHeight: 22 }}>
                {selected.description_es}
              </SystemText>

              {/* Barras de enfoque */}
              <View style={styles.biasSection}>
                <SystemText style={styles.biasTitle}>Enfoque de entrenamiento</SystemText>
                {[
                  { label: 'Fuerza', val: selected.routine_bias.strength, color: colors.danger },
                  { label: 'Cardio', val: selected.routine_bias.cardio, color: colors.warning },
                  { label: 'Flex', val: selected.routine_bias.flexibility, color: colors.success },
                ].map(({ label, val, color }) => (
                  <View key={label} style={styles.biasRow}>
                    <SystemText dim style={styles.biasLabel}>{label}</SystemText>
                    <View style={{ flex: 1 }}>
                      <ProgressBar progress={val} color={color} height={5} />
                    </View>
                    <SystemText dim style={{ fontSize: 11, width: 28, textAlign: 'right' }}>
                      {Math.round(val * 100)}%
                    </SystemText>
                  </View>
                ))}
              </View>
            </SystemWindowPanel>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <SystemPanel style={styles.emptyHint}>
              <SystemText dim style={{ textAlign: 'center', fontSize: 14 }}>
                Toca un cazador para ver sus atributos
              </SystemText>
            </SystemPanel>
          </Animated.View>
        )}

        <SystemButton
          title={selectedId ? 'Confirmar personaje →' : 'Elige un personaje'}
          variant={selectedId ? 'gradient' : 'ghost'}
          disabled={!selectedId || updateProfile.isPending}
          loading={updateProfile.isPending}
          onPress={handleConfirm}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { gap: spacing.sm },
  title: { fontSize: 42, lineHeight: 46, fontWeight: '900' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCell: { width: '48.5%' },

  cardBorder: { borderRadius: radius.lg + 2, padding: 1.5 },
  card: {
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', gap: 6, minHeight: 130,
    justifyContent: 'center',
  },
  cardNormal: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  cardSelected: { backgroundColor: colors.panel },
  cardIcon: { fontSize: 28, marginBottom: 4 },
  charImgBox: { width: '100%', height: 158, borderRadius: radius.md, overflow: 'hidden', marginBottom: 6, backgroundColor: colors.bg },
  charImg: { width: '100%', height: '100%' },
  cardName: { fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
  cardNameDim: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  cardTitle: { fontSize: 11, textAlign: 'center' },

  detailCard: { gap: spacing.md },
  detailImg: { width: '100%', height: 380, borderRadius: radius.md, backgroundColor: colors.bg },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  detailName: { fontSize: 26, fontWeight: '900', lineHeight: 30 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: 96 },
  statCell: {
    width: 42, alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm, paddingVertical: 6,
  },
  statLabel: { fontSize: 9, color: colors.textFaint, letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '900', color: colors.glow },

  biasSection: { gap: 8 },
  biasTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 4 },
  biasRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  biasLabel: { fontSize: 12, width: 40 },

  emptyHint: { paddingVertical: spacing.xl },
});
