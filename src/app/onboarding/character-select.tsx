import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCharacters, useUpdateProfile } from '../../hooks/useData';
import { colors, rankColors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton } from '../../components/system';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.md * 2;

export default function CharacterSelectScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const updateProfile = useUpdateProfile(userId);
  const { data: characters = [], isLoading } = useCharacters();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function handleSelect() {
    if (!selectedId) return;
    await updateProfile.mutateAsync({ active_character_id: selectedId });
    router.push('/onboarding/body-photo');
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <SystemPanel>
          <SystemText>Cargando personajes...</SystemText>
        </SystemPanel>
      </SafeAreaView>
    );
  }

  const selected = characters.find((c) => c.id === selectedId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <SystemTitle>ELIGE TU PERSONAJE</SystemTitle>
          <SystemText>Selecciona el cazador que te inspirará a entrenar</SystemText>
        </SystemPanel>

        {/* Carrusel de personajes */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
          {characters.map((char) => (
            <Pressable
              key={char.id}
              style={[styles.card, selectedId === char.id && styles.cardSelected]}
              onPress={() => setSelectedId(char.id)}
            >
              <View style={[styles.cardImage, { backgroundColor: colors.bgElevated, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.glow, fontSize: 40 }}>⚔️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{char.name}</Text>
                <Text style={styles.cardTitle}>{char.title}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Detalles del personaje seleccionado */}
        {selected ? (
          <SystemPanel>
            <SystemTitle style={{ marginBottom: spacing.md }}>{selected.name}</SystemTitle>
            <Text style={styles.description}>{selected.description_es}</Text>

            <View style={styles.statsGrid}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>STR</Text>
                <Text style={styles.statValue}>{selected.attributes.str}/10</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>AGI</Text>
                <Text style={styles.statValue}>{selected.attributes.agi}/10</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>VIT</Text>
                <Text style={styles.statValue}>{selected.attributes.vit}/10</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>STA</Text>
                <Text style={styles.statValue}>{selected.attributes.sta}/10</Text>
              </View>
            </View>

            <SystemText style={{ marginTop: spacing.lg }}>Enfoque de Entrenamientos:</SystemText>
            <View style={styles.biasRow}>
              <View style={styles.biasItem}>
                <Text style={styles.biasLabel}>Fuerza</Text>
                <View style={styles.biasBar}>
                  <View
                    style={[
                      styles.biasProgress,
                      { width: `${selected.routine_bias.strength * 100}%`, backgroundColor: colors.danger },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.biasItem}>
                <Text style={styles.biasLabel}>Cardio</Text>
                <View style={styles.biasBar}>
                  <View
                    style={[
                      styles.biasProgress,
                      { width: `${selected.routine_bias.cardio * 100}%`, backgroundColor: colors.warning },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.biasItem}>
                <Text style={styles.biasLabel}>Flex</Text>
                <View style={styles.biasBar}>
                  <View
                    style={[
                      styles.biasProgress,
                      { width: `${selected.routine_bias.flexibility * 100}%`, backgroundColor: colors.success },
                    ]}
                  />
                </View>
              </View>
            </View>
          </SystemPanel>
        ) : null}

        <SystemPanel>
          <SystemButton
            title="CONFIRMAR PERSONAJE"
            disabled={!selectedId || updateProfile.isPending}
            loading={updateProfile.isPending}
            onPress={handleSelect}
          />
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  carousel: { marginBottom: spacing.lg, height: 250 },
  card: {
    width: CARD_WIDTH * 0.7,
    marginRight: spacing.md,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.panelBorder,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: colors.glow, borderWidth: 3 },
  cardImage: { width: '100%', height: 180 },
  cardContent: { padding: spacing.md },
  cardName: { color: colors.glow, fontSize: 16, fontWeight: '700' },
  cardTitle: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  description: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.lg },
  stat: { alignItems: 'center' },
  statLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  statValue: { color: colors.glow, fontSize: 16, fontWeight: '800' },
  biasRow: { marginTop: spacing.md },
  biasItem: { marginBottom: spacing.md },
  biasLabel: { color: colors.textDim, fontSize: 12, marginBottom: 4, fontWeight: '600' },
  biasBar: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
  biasProgress: { height: '100%' },
});
