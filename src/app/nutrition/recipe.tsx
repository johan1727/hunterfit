import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useRecipeAI } from '../../hooks/useRecipeAI';
import { useFavoriteRecipes } from '../../lib/favoriteRecipesStore';
import {
  AuroraBackground, GradientText, SystemText, SystemButton, SystemPanel,
} from '../../components/system';
import { colors, spacing, gradients, radius } from '../../theme/system';
import { supabase } from '../../lib/supabase';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Desayuno',
  lunch: '🍽️ Almuerzo',
  dinner: '🌙 Cena',
  snack: '🍿 Snack',
};

const MEAL_MACROS: Record<MealType, { kcal: number; protein: number; carbs: number; fat: number }> = {
  breakfast: { kcal: 500, protein: 40, carbs: 60, fat: 15 },
  lunch: { kcal: 700, protein: 60, carbs: 85, fat: 22 },
  dinner: { kcal: 650, protein: 55, carbs: 75, fat: 20 },
  snack: { kcal: 200, protein: 15, carbs: 25, fat: 7 },
};

export default function RecipeScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);

  const { addFavorite, isFavorited } = useFavoriteRecipes();

  const mealMacros = MEAL_MACROS[mealType];

  const { generateMultiple, recipes, isGenerating, error } = useRecipeAI({
    userCalories: mealMacros.kcal,
    userProtein: mealMacros.protein,
    userCarbs: mealMacros.carbs,
    userFat: mealMacros.fat,
    mealType,
    cuisine: 'latinoamericano',
  });

  const selectedRecipe = recipes?.[selectedRecipeIndex];

  const handleGenerateRecipes = () => {
    if (!userId) {
      Alert.alert('Error', 'Debes estar autenticado');
      return;
    }
    generateMultiple(3);
  };

  const handleSaveAsFavorite = () => {
    if (!selectedRecipe) return;
    addFavorite(selectedRecipe);
    Alert.alert('Éxito', 'Receta guardada en favoritos');
  };

  const handleLogMeal = async () => {
    if (!selectedRecipe || !userId) return;

    try {
      const { error: insertError } = await supabase.from('meal_logs').insert({
        user_id: userId,
        recipe_id: selectedRecipe.id,
        recipe_title: selectedRecipe.title,
        meal_type: mealType,
        total_kcal: selectedRecipe.totalKcal,
        total_protein_g: selectedRecipe.totalProtein,
        total_carbs_g: selectedRecipe.totalCarbs,
        total_fat_g: selectedRecipe.totalFat,
        logged_at: new Date(),
      });

      if (insertError) throw insertError;
      Alert.alert('Éxito', 'Comida registrada');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'No se pudo registrar la comida');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <GradientText style={{ fontSize: 24, fontWeight: '900' }}>RecipeAI</GradientText>
        </View>

        {/* Meal Type Selector */}
        <View style={styles.mealSelector}>
          {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((meal) => (
            <Pressable
              key={meal}
              onPress={() => {
                setMealType(meal);
                setSelectedRecipeIndex(0);
              }}
              style={[
                styles.mealButton,
                mealType === meal && { borderColor: gradients.brand[0], borderWidth: 2 },
              ]}
            >
              <SystemText style={{ fontSize: 12 }}>
                {MEAL_TYPE_LABELS[meal]}
              </SystemText>
            </Pressable>
          ))}
        </View>

        {/* Generate Button */}
        <SystemButton
          title={isGenerating ? 'Generando...' : 'Generar Recetas'}
          onPress={handleGenerateRecipes}
          variant="gradient"
          style={styles.generateBtn}
          disabled={isGenerating}
        />

        {error && (
          <SystemPanel style={styles.errorPanel}>
            <SystemText style={{ color: colors.danger }}>Error: {(error as any)?.message}</SystemText>
          </SystemPanel>
        )}

        {/* Recipe Cards */}
        {recipes && recipes.length > 0 && (
          <>
            {/* Recipe Carousel */}
            <View style={styles.carouselContainer}>
              {recipes.map((recipe, idx) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => setSelectedRecipeIndex(idx)}
                  style={[
                    styles.carouselCard,
                    idx === selectedRecipeIndex && styles.carouselCardActive,
                  ]}
                >
                  <SystemText style={{ fontSize: 13, fontWeight: '700' }}>
                    {recipe.title}
                  </SystemText>
                  <SystemText dim style={{ fontSize: 11, marginTop: 4 }}>
                    {recipe.totalKcal} kcal · {recipe.prepTime} min
                  </SystemText>
                </Pressable>
              ))}
            </View>

            {/* Selected Recipe Details */}
            {selectedRecipe && (
              <>
                {/* Description */}
                <SystemPanel style={styles.descriptionPanel}>
                  <SystemText style={{ fontSize: 14 }}>{selectedRecipe.description}</SystemText>
                </SystemPanel>

                {/* Macro Breakdown */}
                <View style={styles.macroBreakdown}>
                  <View style={styles.macroItem}>
                    <SystemText dim style={{ fontSize: 12 }}>Proteína</SystemText>
                    <SystemText style={{ fontSize: 16, fontWeight: '700', color: '#FF6B6B' }}>
                      {selectedRecipe.macroPercentages.protein}%
                    </SystemText>
                    <SystemText dim style={{ fontSize: 11 }}>
                      {selectedRecipe.totalProtein}g
                    </SystemText>
                  </View>
                  <View style={styles.macroItem}>
                    <SystemText dim style={{ fontSize: 12 }}>Carbohidratos</SystemText>
                    <SystemText style={{ fontSize: 16, fontWeight: '700', color: '#4ECDC4' }}>
                      {selectedRecipe.macroPercentages.carbs}%
                    </SystemText>
                    <SystemText dim style={{ fontSize: 11 }}>
                      {selectedRecipe.totalCarbs}g
                    </SystemText>
                  </View>
                  <View style={styles.macroItem}>
                    <SystemText dim style={{ fontSize: 12 }}>Grasas</SystemText>
                    <SystemText style={{ fontSize: 16, fontWeight: '700', color: '#FFD93D' }}>
                      {selectedRecipe.macroPercentages.fat}%
                    </SystemText>
                    <SystemText dim style={{ fontSize: 11 }}>
                      {selectedRecipe.totalFat}g
                    </SystemText>
                  </View>
                </View>

                {/* Ingredients */}
                <SystemPanel style={styles.ingredientsPanel}>
                  <SystemText style={{ fontSize: 14, fontWeight: '700', marginBottom: spacing.sm }}>
                    Ingredientes
                  </SystemText>
                  {selectedRecipe.foods.map((food, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <SystemText style={{ fontSize: 20 }}>{food.icon}</SystemText>
                      <View style={{ flex: 1 }}>
                        <SystemText style={{ fontSize: 13 }}>{food.name_es}</SystemText>
                        <SystemText dim style={{ fontSize: 11 }}>
                          {food.quantity_g}g · {food.kcal} kcal
                        </SystemText>
                      </View>
                    </View>
                  ))}
                </SystemPanel>

                {/* Cooking Steps */}
                {selectedRecipe.steps.length > 0 && (
                  <SystemPanel style={styles.stepsPanel}>
                    <SystemText style={{ fontSize: 14, fontWeight: '700', marginBottom: spacing.sm }}>
                      Preparación ({selectedRecipe.prepTime} min)
                    </SystemText>
                    {selectedRecipe.steps.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <SystemText style={{ fontWeight: '700', color: gradients.brand[0] }}>
                          {idx + 1}.
                        </SystemText>
                        <SystemText style={{ flex: 1, fontSize: 12, marginLeft: spacing.sm }}>
                          {step}
                        </SystemText>
                      </View>
                    ))}
                  </SystemPanel>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <SystemButton
                    title={isFavorited(selectedRecipe.id) ? '❤️ Favorito' : '🤍 Favorito'}
                    onPress={handleSaveAsFavorite}
                    variant="ghost"
                    style={{ flex: 1 }}
                  />
                  <SystemButton
                    title="Registrar Comida"
                    onPress={handleLogMeal}
                    variant="gradient"
                    style={{ flex: 1, marginLeft: spacing.sm }}
                  />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  mealSelector: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  mealButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
  },
  generateBtn: { marginBottom: spacing.md },
  errorPanel: { backgroundColor: colors.danger + '20', paddingVertical: spacing.sm },
  carouselContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  carouselCard: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  carouselCardActive: { borderColor: gradients.brand[0], borderWidth: 2 },
  descriptionPanel: { marginBottom: spacing.md },
  macroBreakdown: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  macroItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  ingredientsPanel: { marginBottom: spacing.md },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 8 },
  stepsPanel: { marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', marginVertical: 8 },
  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
