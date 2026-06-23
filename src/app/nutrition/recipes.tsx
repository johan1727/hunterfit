import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable, TextInput, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { localDateString } from '../../lib/dates';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel,
  SystemText, SystemButton,
} from '../../components/system';
import { colors, gradients, radius, spacing } from '../../theme/system';

interface Recipe {
  id: number;
  title: string;
  description_es: string | null;
  category: string;
  servings: number;
  prep_minutes: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  ingredients: { name: string; quantity_g: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[];
  instructions_es: string;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  all: '🍽️ Todas',
  desayuno: '☀️ Desayuno',
  comida: '🥗 Comida',
  cena: '🌙 Cena',
  snack: '🍎 Snack',
  postre: '🍫 Postre',
};

const MACRO_COLOR = { kcal: '#FF6B35', protein: '#4AE3B5', carbs: '#6B8FFF', fat: '#FFD166' };

export default function RecipesScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [mealType, setMealType] = useState<'desayuno' | 'comida' | 'cena' | 'snack'>('comida');
  const [logged, setLogged] = useState(false);

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['recipes', category, search],
    queryFn: async () => {
      let q = supabase.from('recipes').select('*').eq('is_public', true);
      if (category !== 'all') q = q.eq('category', category);
      if (search.trim().length >= 2) q = q.ilike('title', `%${search.trim()}%`);
      const { data, error } = await q.order('kcal', { ascending: true }).limit(50);
      if (error) throw error;
      return (data ?? []) as Recipe[];
    },
  });

  const logMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      if (!userId) return;
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: localDateString(),
        meal_type: mealType,
        custom_name: recipe.title,
        quantity_g: 1,
        kcal: recipe.kcal,
        protein_g: recipe.protein_g,
        carbs_g: recipe.carbs_g,
        fat_g: recipe.fat_g,
        source: 'manual',
      });
      if (error) throw error;
      await supabase.rpc('grant_xp', { amount: 10 });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] });
      setLogged(true);
      setTimeout(() => { setLogged(false); setSelected(null); }, 1800);
    },
  });

  if (selected) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header detail */}
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
            <SystemText dim style={{ fontSize: 14 }}>Volver</SystemText>
          </Pressable>

          <SystemWindowPanel style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <GradientText style={{ fontSize: 22, fontWeight: '900', lineHeight: 26 }}>
                  {selected.title}
                </GradientText>
                {selected.description_es && (
                  <SystemText dim style={{ fontSize: 13, marginTop: 4 }}>{selected.description_es}</SystemText>
                )}
              </View>
              <View style={styles.prepBadge}>
                <Ionicons name="time-outline" size={12} color={colors.textDim} />
                <SystemText dim style={{ fontSize: 11 }}> {selected.prep_minutes} min</SystemText>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macroRow}>
              {[
                { label: 'Cal', value: Math.round(selected.kcal), color: MACRO_COLOR.kcal },
                { label: 'Prot', value: `${Math.round(selected.protein_g)}g`, color: MACRO_COLOR.protein },
                { label: 'Carbs', value: `${Math.round(selected.carbs_g)}g`, color: MACRO_COLOR.carbs },
                { label: 'Grasa', value: `${Math.round(selected.fat_g)}g`, color: MACRO_COLOR.fat },
              ].map((m) => (
                <View key={m.label} style={[styles.macroBadge, { borderColor: m.color + '40' }]}>
                  <SystemText style={{ fontSize: 16, fontWeight: '800', color: m.color }}>{m.value}</SystemText>
                  <SystemText dim style={{ fontSize: 11 }}>{m.label}</SystemText>
                </View>
              ))}
            </View>

            {/* Tags */}
            {selected.tags?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {selected.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <SystemText dim style={{ fontSize: 11 }}>#{t}</SystemText>
                  </View>
                ))}
              </View>
            )}
          </SystemWindowPanel>

          {/* Ingredientes */}
          <SystemPanel style={{ gap: spacing.sm }}>
            <SystemText style={{ fontWeight: '700', fontSize: 15 }}>🧂 Ingredientes</SystemText>
            {selected.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingRow}>
                <SystemText style={{ flex: 1, fontSize: 14 }}>{ing.name}</SystemText>
                <SystemText dim style={{ fontSize: 13 }}>{ing.quantity_g}g</SystemText>
              </View>
            ))}
          </SystemPanel>

          {/* Instrucciones */}
          <SystemPanel style={{ gap: spacing.sm }}>
            <SystemText style={{ fontWeight: '700', fontSize: 15 }}>📋 Preparación</SystemText>
            <SystemText dim style={{ fontSize: 14, lineHeight: 22 }}>
              {selected.instructions_es}
            </SystemText>
          </SystemPanel>

          {/* Log meal */}
          <SystemWindowPanel style={{ gap: spacing.md }}>
            <SystemText style={{ fontWeight: '700', fontSize: 15 }}>Registrar esta receta</SystemText>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['desayuno', 'comida', 'cena', 'snack'] as const).map((mt) => (
                <Pressable key={mt} onPress={() => setMealType(mt)}>
                  {mealType === mt ? (
                    <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.mealChipGrad}>
                      <SystemText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{mt}</SystemText>
                    </LinearGradient>
                  ) : (
                    <View style={styles.mealChip}>
                      <SystemText dim style={{ fontSize: 13 }}>{mt}</SystemText>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            {logged ? (
              <View style={styles.successBanner}>
                <SystemText style={{ color: '#4AE3B5', fontWeight: '700' }}>✓ Registrado +10 XP</SystemText>
              </View>
            ) : (
              <SystemButton
                title="Registrar en mi diario"
                variant="gradient"
                loading={logMutation.isPending}
                onPress={() => logMutation.mutate(selected)}
              />
            )}
          </SystemWindowPanel>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
          </Pressable>
          <GradientText style={{ fontSize: 28, fontWeight: '900' }}>Recetas</GradientText>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar recetas..."
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </Pressable>
          )}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg }}>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <Pressable key={cat} onPress={() => setCategory(cat)}>
                {category === cat ? (
                  <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.catChipGrad}>
                    <SystemText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{label}</SystemText>
                  </LinearGradient>
                ) : (
                  <View style={styles.catChip}>
                    <SystemText dim style={{ fontSize: 13 }}>{label}</SystemText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Recipe list */}
        {isLoading ? (
          <SystemText dim style={{ textAlign: 'center', marginTop: 40 }}>Cargando recetas...</SystemText>
        ) : recipes.length === 0 ? (
          <SystemText dim style={{ textAlign: 'center', marginTop: 40 }}>Sin recetas encontradas</SystemText>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {recipes.map((recipe) => (
              <Pressable key={recipe.id} onPress={() => setSelected(recipe)}>
                <SystemPanel style={styles.recipeCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <SystemText style={{ fontWeight: '700', fontSize: 15 }}>{recipe.title}</SystemText>
                    {recipe.description_es && (
                      <SystemText dim style={{ fontSize: 13 }} numberOfLines={1}>{recipe.description_es}</SystemText>
                    )}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      <SystemText style={{ fontSize: 13, color: MACRO_COLOR.kcal, fontWeight: '700' }}>
                        {Math.round(recipe.kcal)} cal
                      </SystemText>
                      <SystemText dim style={{ fontSize: 13 }}>
                        P: {Math.round(recipe.protein_g)}g · C: {Math.round(recipe.carbs_g)}g · G: {Math.round(recipe.fat_g)}g
                      </SystemText>
                    </View>
                  </View>
                  <View style={styles.recipeMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.textDim} />
                    <SystemText dim style={{ fontSize: 11 }}> {recipe.prep_minutes}m</SystemText>
                    <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                  </View>
                </SystemPanel>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.panelBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.panelBorder,
  },
  catChipGrad: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroBadge: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1,
  },
  tag: {
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: colors.bgElevated, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  ingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder + '40',
  },
  mealChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.panelBorder,
  },
  mealChipGrad: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  successBanner: {
    alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: '#4AE3B510', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#4AE3B530',
  },
  prepBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
});
