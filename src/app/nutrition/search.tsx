import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, TextInput, FlatList, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useProfile, useFoodSearch } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { localDateString } from '../../lib/dates';
import { analyzeFoodPhoto, type FoodAnalysisResult } from '../../services/ai';
import { colors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton } from '../../components/system';
import type { Food } from '../../types/db';

export default function SearchFoodScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: foods = [] } = useFoodSearch(searchTerm);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<'desayuno' | 'comida' | 'cena' | 'snack'>('comida');
  const [saving, setSaving] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [aiResults, setAiResults] = useState<FoodAnalysisResult | null>(null);
  const [savingAi, setSavingAi] = useState(false);

  async function handleAddMeal() {
    if (!selectedFood || !quantity) return;
    try {
      setSaving(true);
      const qty = parseFloat(quantity);
      const multiplier = qty / selectedFood.serving_g;
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: localDateString(),
        meal_type: mealType,
        food_id: selectedFood.id,
        custom_name: selectedFood.name_es,
        quantity_g: Math.round(qty),
        kcal: Math.round(selectedFood.kcal * multiplier),
        protein_g: Math.round(selectedFood.protein_g * multiplier * 10) / 10,
        carbs_g: Math.round(selectedFood.carbs_g * multiplier * 10) / 10,
        fat_g: Math.round(selectedFood.fat_g * multiplier * 10) / 10,
        source: 'manual',
      });
      if (error) throw error;
      router.replace('/(tabs)/nutrition');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyzePhoto() {
    if (!profile?.is_premium) {
      Alert.alert('Premium Requerido', 'El análisis de fotos es una característica premium');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setAnalyzeLoading(true);
        const analysisResult = await analyzeFoodPhoto(result.assets[0].base64, 'image/jpeg');
        setAiResults(analysisResult);
      }
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'No se pudo analizar la foto');
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleSaveAiResults() {
    if (!aiResults || aiResults.items.length === 0) return;
    try {
      setSavingAi(true);
      const rows = aiResults.items.map((item) => ({
        user_id: userId,
        date: localDateString(),
        meal_type: mealType,
        custom_name: item.nombre,
        quantity_g: Math.round(item.gramos_estimados),
        kcal: Math.round(item.kcal),
        protein_g: Math.round(item.protein_g * 10) / 10,
        carbs_g: Math.round(item.carbs_g * 10) / 10,
        fat_g: Math.round(item.fat_g * 10) / 10,
        source: 'ai_photo',
      }));
      const { error } = await supabase.from('meal_logs').insert(rows);
      if (error) throw error;
      router.replace('/(tabs)/nutrition');
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'No se pudieron guardar los alimentos');
    } finally {
      setSavingAi(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <SystemTitle>BUSCAR ALIMENTO</SystemTitle>
          {profile?.is_premium && (
            <SystemButton
              title="📸 ANALIZAR CON IA"
              loading={analyzeLoading}
              onPress={handleAnalyzePhoto}
              variant="ghost"
              style={{ marginTop: spacing.md }}
            />
          )}
        </SystemPanel>

        <SystemPanel>
          <TextInput
            style={styles.searchInput}
            placeholder="Busca un alimento (ej: pollo, manzana, arroz)"
            placeholderTextColor={colors.textDim}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </SystemPanel>

        {aiResults ? (
          <SystemPanel>
            <SystemTitle style={{ marginBottom: spacing.sm }}>RESULTADO DEL ANÁLISIS</SystemTitle>
            <SystemText style={{ marginBottom: spacing.md, color: colors.textDim }}>
              Confianza: {aiResults.confianza}
            </SystemText>
            {aiResults.items.map((item, i) => (
              <View key={i} style={styles.foodItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{item.nombre}</Text>
                  <Text style={styles.foodInfo}>
                    ~{Math.round(item.gramos_estimados)}g • {Math.round(item.protein_g)}g P • {Math.round(item.carbs_g)}g C • {Math.round(item.fat_g)}g G
                  </Text>
                </View>
                <Text style={styles.foodName}>{Math.round(item.kcal)} kcal</Text>
              </View>
            ))}

            <Text style={styles.label}>Agregar como:</Text>
            <View style={styles.mealTypeButtons}>
              {(['desayuno', 'comida', 'cena', 'snack'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(type)}
                >
                  <Text style={[styles.mealTypeBtnText, mealType === type && { color: colors.white }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SystemButton
              title="GUARDAR ALIMENTOS DETECTADOS"
              loading={savingAi}
              onPress={handleSaveAiResults}
            />
            <SystemButton
              title="DESCARTAR"
              variant="ghost"
              onPress={() => setAiResults(null)}
              disabled={savingAi}
              style={{ marginTop: spacing.sm }}
            />
          </SystemPanel>
        ) : null}

        {searchTerm.length >= 2 && foods.length > 0 ? (
          <SystemPanel>
            <Text style={styles.resultsLabel}>Resultados ({foods.length})</Text>
            <FlatList
              data={foods}
              keyExtractor={(item) => `${item.id}`}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.foodItem, selectedFood?.id === item.id && styles.foodItemSelected]}
                  onPress={() => {
                    setSelectedFood(item);
                    setQuantity(item.serving_g.toString());
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{item.name_es}</Text>
                    <Text style={styles.foodInfo}>
                      {item.kcal} kcal • {item.protein_g}g P • {item.serving_g}g porción
                    </Text>
                  </View>
                  <Text style={styles.selectArrow}>›</Text>
                </Pressable>
              )}
            />
          </SystemPanel>
        ) : searchTerm.length >= 2 ? (
          <SystemPanel>
            <SystemText style={{ textAlign: 'center', color: colors.textDim }}>
              Sin resultados. Intenta otro término.
            </SystemText>
          </SystemPanel>
        ) : null}

        {selectedFood ? (
          <SystemPanel>
            <SystemTitle style={{ marginBottom: spacing.md }}>
              {selectedFood.name_es}
            </SystemTitle>

            <Text style={styles.label}>Cantidad (gramos)</Text>
            <TextInput
              style={styles.quantityInput}
              placeholder="100"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Tipo de Comida</Text>
            <View style={styles.mealTypeButtons}>
              {(['desayuno', 'comida', 'cena', 'snack'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(type)}
                >
                  <Text
                    style={[
                      styles.mealTypeBtnText,
                      mealType === type && { color: colors.white },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.nutritionSummary}>
              <Text style={styles.summaryLabel}>Este alimento te aportará:</Text>
              {(() => {
                const qty = parseFloat(quantity) || 0;
                const multiplier = qty / selectedFood.serving_g;
                return (
                  <View style={styles.summaryValues}>
                    <Text style={styles.summaryValue}>
                      {(selectedFood.kcal * multiplier).toFixed(0)} kcal
                    </Text>
                    <Text style={styles.summaryValue}>
                      {(selectedFood.protein_g * multiplier).toFixed(1)}g proteína
                    </Text>
                    <Text style={styles.summaryValue}>
                      {(selectedFood.carbs_g * multiplier).toFixed(1)}g carbohidratos
                    </Text>
                    <Text style={styles.summaryValue}>
                      {(selectedFood.fat_g * multiplier).toFixed(1)}g grasas
                    </Text>
                  </View>
                );
              })()}
            </View>

            <SystemButton
              title="AGREGAR A COMIDAS"
              loading={saving}
              onPress={handleAddMeal}
            />
          </SystemPanel>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  searchInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  resultsLabel: { color: colors.textDim, fontSize: 12, marginBottom: spacing.md, fontWeight: '700' },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.panelBorder,
  },
  foodItemSelected: { backgroundColor: `${colors.primary}15` },
  foodName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  foodInfo: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  selectArrow: { color: colors.glow, fontSize: 20, fontWeight: '300' },
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  quantityInput: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  mealTypeButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 8,
    alignItems: 'center',
  },
  mealTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.glow },
  mealTypeBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  nutritionSummary: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryLabel: { color: colors.glow, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  summaryValues: { marginLeft: spacing.md },
  summaryValue: { color: colors.text, fontSize: 13, marginVertical: 4 },
});
