import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, FlatList, Alert, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useDemoStore } from '../../lib/demoStore';
import { useProfile, useFoodSearch, useDefaultFoods, useGrantXp, useFavorites, useAddFavorite, useRemoveFavorite, useFoodCategories, useRecentFoods } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { localDateString } from '../../lib/dates';
import { analyzeFoodPhoto, type FoodAnalysisResult } from '../../services/ai';
import { updateQuestProgress } from '../../services/quests';
import { checkAndAwardBadges } from '../../services/badges';
import { useNetworkError } from '../../lib/networkError';

async function checkMealBadges(userId: string) {
  const { data: days } = await supabase
    .from('meal_logs').select('date').eq('user_id', userId);
  const uniqueDays = new Set((days ?? []).map((r: any) => r.date)).size;
  const { data: p } = await supabase.from('profiles').select('level,rank,streak_days').eq('id', userId).single();
  await checkAndAwardBadges(userId, {
    totalMealDays: uniqueDays,
    level: p?.level ?? 1,
    rank: p?.rank ?? 'E',
    streakDays: p?.streak_days ?? 0,
  });
}

async function checkMealQuest(userId: string) {
  const today = localDateString();
  const [{ data: meals }, { data: quests }] = await Promise.all([
    supabase.from('meal_logs').select('id').eq('user_id', userId).eq('date', today),
    supabase.from('quests').select('*').eq('user_id', userId).eq('date', today).eq('type', 'log_meals').eq('completed', false),
  ]);
  if (quests && quests.length > 0 && meals) {
    await updateQuestProgress(quests[0] as any, meals.length);
  }
}
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemPanel,
  SystemWindowPanel,
  SystemText,
  SystemButton,
  SystemInput,
  SystemLabel,
  StatRow,
} from '../../components/system';
import { EmptyState } from '../../components/EmptyState';
import { EMPTY_STATES } from '../../lib/emptyState';
import { ListSkeleton } from '../../components/ListSkeleton';
import type { Food } from '../../types/db';

const CATEGORY_EMOJI: Record<string, string> = {
  'proteínas': '🥩', 'proteinas': '🥩',
  'verduras': '🥦',
  'frutas': '🍎',
  'lácteos': '🥛', 'lacteos': '🥛',
  'cereales': '🌾',
  'snacks': '🍫',
  'grasas': '🫒',
  'bebidas': '🥤',
  'legumbres': '🫘',
  'platillos': '🍲',
};

function getCategoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat.toLowerCase()] ?? '🏷️';
}

// Subcategorías por categoría (clasificación por palabras clave del nombre).
// La de keywords vacías [] es el catch-all "Otros".
type Subcat = { label: string; emoji: string; kw: string[] };
const SUBCATS: Record<string, Subcat[]> = {
  'Proteínas': [
    { label: 'Aves', emoji: '🍗', kw: ['pollo', 'pavo', 'pechuga', 'gallina'] },
    { label: 'Carnes rojas', emoji: '🥩', kw: ['res', 'cerdo', 'carne', 'bistec', 'molida', 'lomo', 'chuleta', 'ternera', 'cordero', 'arrachera'] },
    { label: 'Pescados', emoji: '🐟', kw: ['pescado', 'atún', 'salmón', 'camarón', 'marisco', 'tilapia', 'trucha', 'sardina', 'mojarra'] },
    { label: 'Huevos', emoji: '🥚', kw: ['huevo', 'clara'] },
    { label: 'Embutidos', emoji: '🌭', kw: ['jamón', 'salchicha', 'tocino', 'chorizo', 'salami'] },
    { label: 'Otras', emoji: '💪', kw: [] },
  ],
  'Cereales': [
    { label: 'Arroz', emoji: '🍚', kw: ['arroz'] },
    { label: 'Pastas', emoji: '🍝', kw: ['pasta', 'fideo', 'espagueti', 'macarrón', 'lasaña'] },
    { label: 'Panes', emoji: '🍞', kw: ['pan', 'tortilla', 'bagel', 'baguette', 'bolillo'] },
    { label: 'Avena y cereal', emoji: '🥣', kw: ['avena', 'granola', 'cereal', 'muesli', 'hojuela'] },
    { label: 'Otros', emoji: '🌾', kw: [] },
  ],
  'Grasas': [
    { label: 'Aceites', emoji: '🫒', kw: ['aceite'] },
    { label: 'Frutos secos', emoji: '🥜', kw: ['almendra', 'nuez', 'cacahuate', 'maní', 'pistache', 'avellana', 'marañón'] },
    { label: 'Semillas', emoji: '🌰', kw: ['semilla', 'chía', 'linaza', 'girasol', 'calabaza'] },
    { label: 'Mantequillas', emoji: '🧈', kw: ['mantequilla', 'manteca', 'margarina'] },
    { label: 'Otras', emoji: '🥑', kw: [] },
  ],
  'Verduras': [
    { label: 'De hoja', emoji: '🥬', kw: ['lechuga', 'espinaca', 'acelga', 'kale', 'arúgula', 'col '] },
    { label: 'Crucíferas', emoji: '🥦', kw: ['brócoli', 'coliflor', 'repollo'] },
    { label: 'Raíces', emoji: '🥕', kw: ['zanahoria', 'betabel', 'papa', 'camote', 'rábano', 'nabo'] },
    { label: 'Otras', emoji: '🍅', kw: [] },
  ],
  'Frutas': [
    { label: 'Cítricos', emoji: '🍊', kw: ['naranja', 'limón', 'mandarina', 'toronja', 'lima'] },
    { label: 'Tropicales', emoji: '🥭', kw: ['mango', 'piña', 'papaya', 'plátano', 'banana', 'coco', 'guayaba', 'maracuyá'] },
    { label: 'Bayas', emoji: '🫐', kw: ['fresa', 'mora', 'arándano', 'frambuesa', 'zarzamora'] },
    { label: 'Otras', emoji: '🍎', kw: [] },
  ],
  'Lácteos': [
    { label: 'Quesos', emoji: '🧀', kw: ['queso'] },
    { label: 'Yogur', emoji: '🥛', kw: ['yogur', 'yoghurt'] },
    { label: 'Leches', emoji: '🍼', kw: ['leche'] },
    { label: 'Otros', emoji: '🧈', kw: [] },
  ],
  'Legumbres': [
    { label: 'Frijoles', emoji: '🫘', kw: ['frijol', 'alubia', 'judía'] },
    { label: 'Lentejas', emoji: '🍲', kw: ['lenteja'] },
    { label: 'Garbanzos', emoji: '🧆', kw: ['garbanzo'] },
    { label: 'Otras', emoji: '🌱', kw: [] },
  ],
  'Bebidas': [
    { label: 'Sin azúcar', emoji: '💧', kw: ['agua', 'té', 'café'] },
    { label: 'Jugos', emoji: '🧃', kw: ['jugo', 'néctar'] },
    { label: 'Refrescos', emoji: '🥤', kw: ['refresco', 'soda', 'cola'] },
    { label: 'Otras', emoji: '☕', kw: [] },
  ],
  'Snacks': [
    { label: 'Dulces', emoji: '🍬', kw: ['chocolate', 'dulce', 'galleta', 'caramelo', 'pastel', 'helado'] },
    { label: 'Salados', emoji: '🍿', kw: ['papas', 'frituras', 'palomitas', 'chips', 'pretzel'] },
    { label: 'Barras', emoji: '🍫', kw: ['barra', 'protein'] },
    { label: 'Otros', emoji: '🍪', kw: [] },
  ],
  'Platillos': [
    { label: 'Mexicanos', emoji: '🌮', kw: ['taco', 'enchilada', 'quesadilla', 'pozole', 'tamal', 'chilaquiles', 'mole', 'sope'] },
    { label: 'Sopas', emoji: '🍲', kw: ['sopa', 'caldo', 'crema'] },
    { label: 'Ensaladas', emoji: '🥗', kw: ['ensalada'] },
    { label: 'Otros', emoji: '🍽️', kw: [] },
  ],
};

function classifySubcat(name: string, category: string): string | null {
  const subs = SUBCATS[category];
  if (!subs) return null;
  const n = name.toLowerCase();
  const match = subs.find(s => s.kw.length > 0 && s.kw.some(k => n.includes(k)));
  if (match) return match.label;
  const fallback = subs.find(s => s.kw.length === 0);
  return fallback?.label ?? null;
}

const MEAL_TYPES = [
  { key: 'desayuno', label: 'Desayuno', dot: colors.warning },
  { key: 'comida', label: 'Comida', dot: colors.glow },
  { key: 'cena', label: 'Cena', dot: colors.accent },
  { key: 'snack', label: 'Snack', dot: colors.success },
] as const;

type MealType = typeof MEAL_TYPES[number]['key'];

export default function SearchFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { userId } = useAuth();
  const isDemo = useDemoStore((s) => s.isDemo);
  const { handleError } = useNetworkError();
  const { data: profile } = useProfile(userId);
  const logDate = params.date ?? localDateString();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);
  const { data: searchResults = [], isLoading: searching } = useFoodSearch(searchTerm, selectedCategory);
  const { data: defaultFoods = [] } = useDefaultFoods(selectedCategory);
  const { data: dbCategories = [] } = useFoodCategories();
  const { data: recentFoods = [] } = useRecentFoods(isDemo ? null : userId);

  function selectCategory(cat: string) {
    setSelectedCategory(cat);
    setSelectedSubcat(null); // resetear subcategoría al cambiar de categoría
  }

  // Mostrar resultados de búsqueda si hay (≥2 caracteres), si no mostrar alimentos por defecto
  const baseFoods = searchTerm.length >= 2 ? searchResults : defaultFoods;
  // Filtro de subcategoría (cuando hay una seleccionada dentro de una categoría)
  const foods = selectedSubcat
    ? baseFoods.filter(f => classifySubcat(f.name_es, selectedCategory) === selectedSubcat)
    : baseFoods;
  const subcats = selectedCategory !== 'all' ? SUBCATS[selectedCategory] : undefined;
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<MealType>('comida');
  const [saving, setSaving] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [aiResults, setAiResults] = useState<FoodAnalysisResult | null>(null);
  const [savingAi, setSavingAi] = useState(false);
  const grantXp = useGrantXp(userId);

  // Formulario manual
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const favorites = useFavorites(isDemo ? null : userId);
  const addFavorite = useAddFavorite(isDemo ? null : userId);
  const removeFavorite = useRemoveFavorite(isDemo ? null : userId);
  const [showFavorites, setShowFavorites] = useState(false);


  async function handleAddMeal() {
    if (!selectedFood || !quantity || !userId) return;
    if (isDemo) {
      Alert.alert('Modo exploración', 'Los cambios no se guardan en modo demo.');
      return;
    }
    try {
      setSaving(true);
      const qty = parseFloat(quantity);
      const mult = qty / selectedFood.serving_g;
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: logDate,
        meal_type: mealType,
        food_id: selectedFood.id,
        custom_name: selectedFood.name_es,
        quantity_g: Math.round(qty),
        kcal: Math.round(selectedFood.kcal * mult),
        protein_g: Math.round(selectedFood.protein_g * mult * 10) / 10,
        carbs_g: Math.round(selectedFood.carbs_g * mult * 10) / 10,
        fat_g: Math.round(selectedFood.fat_g * mult * 10) / 10,
        source: 'manual',
      });
      if (error) throw error;
      grantXp.mutate(10);
      void checkMealQuest(userId); void checkMealBadges(userId);
      void supabase.rpc('update_streak');
      router.replace('/(tabs)/nutrition');
    } catch (err: any) {
      const handled = handleError(err, 'Agregar comida');
      if (!handled) {
        console.error('Error:', err);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyzePhoto() {
    if (!userId) return;
    if (isDemo) {
      Alert.alert('Modo exploración', 'El análisis con IA no está disponible en modo demo.');
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
        setAiResults(await analyzeFoodPhoto(result.assets[0].base64, 'image/jpeg'));
      }
    } catch (err: any) {
      const handled = handleError(err, 'Analizar foto');
      if (!handled) {
        Alert.alert('Error', 'No se pudo analizar la foto');
      }
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleSaveAiResults() {
    if (!aiResults?.items.length || !userId) return;
    if (isDemo) {
      Alert.alert('Modo exploración', 'Los cambios no se guardan en modo demo.');
      return;
    }
    try {
      setSavingAi(true);
      const rows = aiResults.items.map((item) => ({
        user_id: userId,
        date: logDate,
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
      grantXp.mutate(aiResults.items.length * 10);
      void checkMealQuest(userId); void checkMealBadges(userId);
      void supabase.rpc('update_streak');
      router.replace('/(tabs)/nutrition');
    } catch (err: any) {
      const handled = handleError(err, 'Guardar alimentos detectados');
      if (!handled) {
        Alert.alert('Error', 'No se pudieron guardar los alimentos');
      }
    } finally {
      setSavingAi(false);
    }
  }

  async function handleSaveManual() {
    if (!manualName.trim() || !manualKcal || !userId) return;
    if (isDemo) { Alert.alert('Modo exploración', 'Los cambios no se guardan en modo demo.'); return; }
    try {
      setSavingManual(true);
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: logDate,
        meal_type: mealType,
        custom_name: manualName.trim(),
        quantity_g: 100,
        kcal: Math.round(parseFloat(manualKcal) || 0),
        protein_g: Math.round((parseFloat(manualProtein) || 0) * 10) / 10,
        carbs_g: Math.round((parseFloat(manualCarbs) || 0) * 10) / 10,
        fat_g: Math.round((parseFloat(manualFat) || 0) * 10) / 10,
        source: 'manual',
      });
      if (error) throw error;
      grantXp.mutate(10);
      void checkMealQuest(userId); void checkMealBadges(userId);
      void supabase.rpc('update_streak');
      router.replace('/(tabs)/nutrition');
    } catch (err: any) {
      const handled = handleError(err, 'Guardar alimento manual');
      if (!handled) {
        Alert.alert('Error', 'No se pudo guardar el alimento');
      }
    } finally {
      setSavingManual(false);
    }
  }

  function isFavorite(foodId: number) {
    return (favorites.data ?? []).some((f) => f.food_id === foodId);
  }

  function toggleFavorite(food: Food) {
    const existing = (favorites.data ?? []).find((f) => f.food_id === food.id);
    if (existing) {
      removeFavorite.mutate(existing.id);
    } else {
      addFavorite.mutate({
        name: food.name_es,
        kcal: food.kcal,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        food_id: food.id,
      });
    }
  }

  async function handleAddFromFavorite(fav: { id: string; name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) {
    if (!fav || isDemo || !userId) return;
    try {
      const { error } = await supabase.from('meal_logs').insert({
        user_id: userId,
        date: logDate,
        meal_type: mealType,
        custom_name: fav.name,
        quantity_g: 100,
        kcal: fav.kcal,
        protein_g: fav.protein_g,
        carbs_g: fav.carbs_g,
        fat_g: fav.fat_g,
        source: 'favorite',
      });
      if (error) throw error;
      grantXp.mutate(10);
      void checkMealQuest(userId!); void checkMealBadges(userId!);
      void supabase.rpc('update_streak');
      router.replace('/(tabs)/nutrition');
    } catch {
      Alert.alert('Error', 'No se pudo agregar el favorito');
    }
  }

  const qty = parseFloat(quantity) || 0;
  const mult = selectedFood ? qty / selectedFood.serving_g : 0;

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <GradientText style={styles.title}>Buscar{'\n'}Alimento</GradientText>
            <Pressable
              onPress={() => router.push(`/nutrition/barcode?date=${logDate}&type=${mealType}`)}
              style={styles.barcodeBtn}
            >
              <SystemText style={{ fontSize: 22 }}>▦</SystemText>
              <SystemText dim style={{ fontSize: 10, marginTop: 2 }}>Barcode</SystemText>
            </Pressable>
          </View>
          <SystemButton
            title="📸  Analizar foto con IA"
            variant="ghost"
            loading={analyzeLoading}
            onPress={handleAnalyzePhoto}
          />
        </View>

        {/* Selector de tipo de comida */}
        <View style={styles.mealTypeRow}>
          {MEAL_TYPES.map(({ key, label, dot }) => {
            const active = mealType === key;
            return (
              <Pressable
                key={key}
                onPress={() => setMealType(key)}
                style={[
                  styles.mealPill,
                  active && { borderColor: dot + '60', backgroundColor: dot + '18' },
                ]}
              >
                <View style={[styles.mealDot, { backgroundColor: active ? dot : colors.textFaint }]} />
                <SystemText style={[styles.mealPillText, { color: active ? colors.text : colors.textDim }]}>
                  {label}
                </SystemText>
              </Pressable>
            );
          })}
        </View>

        {/* Favoritos */}
        {!isDemo && (favorites.data?.length ?? 0) > 0 && (
          <Pressable
            onPress={() => setShowFavorites((v) => !v)}
            style={styles.favToggle}
          >
            <SystemText style={{ fontSize: 13, color: colors.warning, fontWeight: '700' }}>
              ⭐ Mis favoritos ({favorites.data!.length})
            </SystemText>
            <SystemText dim style={{ fontSize: 12 }}>{showFavorites ? '▲' : '▼'}</SystemText>
          </Pressable>
        )}
        {showFavorites && (favorites.data?.length ?? 0) > 0 && (
          <SystemPanel style={{ gap: 0 }}>
            {favorites.data!.map((fav) => (
              <Pressable
                key={fav.id}
                style={styles.foodRow}
                onPress={() => handleAddFromFavorite(fav)}
              >
                <SystemText style={{ fontSize: 20 }}>⭐</SystemText>
                <View style={{ flex: 1 }}>
                  <SystemText style={styles.foodName}>{fav.name}</SystemText>
                  <SystemText dim style={styles.foodMeta}>
                    {Math.round(fav.kcal)} kcal · {fav.protein_g}g P
                  </SystemText>
                </View>
                <Pressable onPress={() => removeFavorite.mutate(fav.id)} hitSlop={8}>
                  <SystemText style={{ color: colors.danger, fontSize: 16 }}>✕</SystemText>
                </Pressable>
              </Pressable>
            ))}
          </SystemPanel>
        )}

        {/* Buscador */}
        <SystemInput
          placeholder="Busca un alimento (ej: pollo, arroz, manzana)"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {/* Categorías de alimentos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4, gap: 8 }}
        >
          {/* Pill "Todos" siempre primero */}
          <Pressable
            onPress={() => selectCategory('all')}
            style={[
              styles.catPill,
              selectedCategory === 'all' && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
            ]}
          >
            <Text style={{ fontSize: 13 }}>⚡</Text>
            <SystemText style={[styles.catPillText, { color: selectedCategory === 'all' ? colors.accent : colors.textDim }]}>
              Todos
            </SystemText>
          </Pressable>

          {/* Categorías reales de la BD */}
          {dbCategories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => selectCategory(cat)}
                style={[
                  styles.catPill,
                  isActive && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                ]}
              >
                <Text style={{ fontSize: 13 }}>{getCategoryEmoji(cat)}</Text>
                <SystemText style={[styles.catPillText, { color: isActive ? colors.accent : colors.textDim }]}>
                  {cat}
                </SystemText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Subcategorías de la categoría activa */}
        {subcats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4, gap: 6 }}
          >
            <Pressable
              onPress={() => setSelectedSubcat(null)}
              style={[styles.subPill, !selectedSubcat && styles.subPillActive]}
            >
              <SystemText style={[styles.subPillText, { color: !selectedSubcat ? colors.text : colors.textFaint }]}>
                Todas
              </SystemText>
            </Pressable>
            {subcats.map(sub => {
              const isActive = selectedSubcat === sub.label;
              return (
                <Pressable
                  key={sub.label}
                  onPress={() => setSelectedSubcat(sub.label)}
                  style={[styles.subPill, isActive && styles.subPillActive]}
                >
                  <Text style={{ fontSize: 12 }}>{sub.emoji}</Text>
                  <SystemText style={[styles.subPillText, { color: isActive ? colors.text : colors.textFaint }]}>
                    {sub.label}
                  </SystemText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Resultados IA */}
        {aiResults && (
          <SystemWindowPanel style={styles.aiResults}>
            <Pill dotColor={colors.glow}>Análisis IA</Pill>
            <SystemText dim style={{ fontSize: 13 }}>Confianza: {aiResults.confianza}</SystemText>
            {aiResults.items.map((item, i) => (
              <View key={i} style={styles.foodRow}>
                <View style={{ flex: 1 }}>
                  <SystemText style={styles.foodName}>{item.nombre}</SystemText>
                  <SystemText dim style={styles.foodMeta}>
                    ~{Math.round(item.gramos_estimados)}g · {Math.round(item.protein_g)}P · {Math.round(item.carbs_g)}C · {Math.round(item.fat_g)}G
                  </SystemText>
                </View>
                <SystemText style={{ color: colors.glow, fontWeight: '700' }}>
                  {Math.round(item.kcal)} kcal
                </SystemText>
              </View>
            ))}
            <SystemButton
              title="Guardar alimentos detectados"
              variant="gradient"
              loading={savingAi}
              onPress={handleSaveAiResults}
            />
            <SystemButton
              title="Descartar"
              variant="ghost"
              disabled={savingAi}
              onPress={() => setAiResults(null)}
            />
          </SystemWindowPanel>
        )}

        {/* Recientes (search-first: antes de Populares, sin búsqueda ni categoría) */}
        {searchTerm.length < 2 && selectedCategory === 'all' && recentFoods.length > 0 && (
          <SystemPanel style={styles.resultsPanel}>
            <SystemText dim style={styles.resultsLabel}>🕐 Recientes</SystemText>
            {recentFoods.map((item) => (
              <Pressable
                key={`recent-${item.id}`}
                style={styles.foodRow}
                onPress={() => { setSelectedFood(item); setQuantity(item.serving_g.toString()); }}
              >
                <SystemText style={{ fontSize: 22 }}>{(item as any).icon ?? '🍽️'}</SystemText>
                <View style={{ flex: 1 }}>
                  <SystemText style={styles.foodName}>{item.name_es}</SystemText>
                  <SystemText dim style={styles.foodMeta}>{item.kcal} kcal · porción {item.serving_g}g</SystemText>
                </View>
                <SystemText style={{ color: colors.glow, fontSize: 18 }}>›</SystemText>
              </Pressable>
            ))}
          </SystemPanel>
        )}

        {/* Lista de resultados o sugeridos */}
        {searchTerm.length >= 2 && searching ? (
          <SystemPanel style={styles.resultsPanel}>
            <ListSkeleton rows={5} />
          </SystemPanel>
        ) : foods.length > 0 ? (
          <SystemPanel style={styles.resultsPanel}>
            <SystemText dim style={styles.resultsLabel}>
              {searchTerm.length >= 2 ? `${foods.length} resultado${foods.length !== 1 ? 's' : ''}` : 'Populares'}
            </SystemText>
            <FlatList
              data={foods}
              keyExtractor={(item) => `${item.id}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.foodRow, selectedFood?.id === item.id && styles.foodRowSelected]}
                  onPress={() => { setSelectedFood(item); setQuantity(item.serving_g.toString()); }}
                >
                  <SystemText style={{ fontSize: 22 }}>{(item as any).icon ?? '🍽️'}</SystemText>
                  <View style={{ flex: 1 }}>
                    <SystemText style={styles.foodName}>{item.name_es}</SystemText>
                    <SystemText dim style={styles.foodMeta}>
                      {item.kcal} kcal · {item.protein_g}g proteína · porción {item.serving_g}g
                    </SystemText>
                  </View>
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                    hitSlop={8}
                  >
                    <SystemText style={{ fontSize: 18, color: isFavorite(item.id) ? colors.warning : colors.textFaint }}>
                      {isFavorite(item.id) ? '⭐' : '☆'}
                    </SystemText>
                  </Pressable>
                  <SystemText style={{ color: colors.glow, fontSize: 18 }}>›</SystemText>
                </Pressable>
              )}
            />
          </SystemPanel>
        ) : searchTerm.length >= 2 ? (
          <SystemPanel>
            <SystemText dim style={{ textAlign: 'center', marginBottom: spacing.sm }}>
              Sin resultados para "{searchTerm}"
            </SystemText>
            <SystemButton
              title="✏️  Crear alimento manualmente"
              variant="ghost"
              onPress={() => { setShowManual(true); setManualName(searchTerm); }}
            />
          </SystemPanel>
        ) : null}

        {/* Empty state */}
        {!showManual && searchTerm.length < 2 && foods.length === 0 && (favorites.data?.length ?? 0) === 0 && (
          <EmptyState
            {...EMPTY_STATES.meals}
            cta={{ label: 'Buscar alimentos', onPress: () => setSearchTerm('pollo') }}
          />
        )}

        {/* Botón crear manual */}
        {!showManual && (
          <LinearGradient
            colors={[colors.glow + '25', colors.accent + '15']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.manualCtaGradient}
          >
            <Pressable onPress={() => setShowManual(true)} style={styles.manualCta}>
              <SystemText style={{ fontSize: 16, fontWeight: '700', color: colors.glow }}>
                ✏️  Crear alimento personalizado
              </SystemText>
              <SystemText dim style={{ fontSize: 12 }}>Ingresa nombre, calorías y macros</SystemText>
            </Pressable>
          </LinearGradient>
        )}

        {/* Formulario manual */}
        {showManual && (
          <SystemWindowPanel style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SystemText style={{ fontSize: 16, fontWeight: '700' }}>Alimento personalizado</SystemText>
              <Pressable onPress={() => setShowManual(false)}>
                <SystemText dim style={{ fontSize: 13 }}>Cancelar</SystemText>
              </Pressable>
            </View>

            <SystemInput
              placeholder="Nombre del alimento *"
              value={manualName}
              onChangeText={setManualName}
            />

            <View style={styles.macroInputRow}>
              <View style={styles.macroInputCell}>
                <SystemText dim style={styles.macroInputLabel}>Calorías *</SystemText>
                <SystemInput
                  placeholder="0"
                  value={manualKcal}
                  onChangeText={setManualKcal}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.macroInputCell}>
                <SystemText dim style={styles.macroInputLabel}>Proteína (g)</SystemText>
                <SystemInput
                  placeholder="0"
                  value={manualProtein}
                  onChangeText={setManualProtein}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.macroInputRow}>
              <View style={styles.macroInputCell}>
                <SystemText dim style={styles.macroInputLabel}>Carbos (g)</SystemText>
                <SystemInput
                  placeholder="0"
                  value={manualCarbs}
                  onChangeText={setManualCarbs}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.macroInputCell}>
                <SystemText dim style={styles.macroInputLabel}>Grasas (g)</SystemText>
                <SystemInput
                  placeholder="0"
                  value={manualFat}
                  onChangeText={setManualFat}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Preview rápido */}
            {manualKcal ? (
              <View style={styles.manualPreview}>
                <SystemText style={{ color: colors.glow, fontWeight: '900', fontSize: 22 }}>
                  {manualKcal} kcal
                </SystemText>
                <SystemText dim style={{ fontSize: 12 }}>
                  {manualProtein || 0}g P · {manualCarbs || 0}g C · {manualFat || 0}g G
                </SystemText>
              </View>
            ) : null}

            <SystemButton
              title="Agregar a mis comidas"
              variant="gradient"
              loading={savingManual}
              disabled={!manualName.trim() || !manualKcal}
              onPress={handleSaveManual}
            />
          </SystemWindowPanel>
        )}

        {/* Detalle del alimento seleccionado */}
        {selectedFood && (
          <SystemWindowPanel style={styles.selectedCard}>
            <GradientText style={styles.selectedName}>{selectedFood.name_es}</GradientText>

            <View style={styles.qtyRow}>
              <SystemLabel style={{ flex: 0 }}>Cantidad</SystemLabel>
              <SystemInput
                placeholder="100"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                style={{ flex: 1 }}
              />
              <SystemText dim style={styles.qtyUnit}>g</SystemText>
            </View>

            {/* Resumen nutricional */}
            <SystemPanel style={styles.nutritionBox}>
              <StatRow
                label="Calorías"
                value={`${(selectedFood.kcal * mult).toFixed(0)} kcal`}
              />
              <StatRow
                label="Proteína"
                value={`${(selectedFood.protein_g * mult).toFixed(1)} g`}
              />
              <StatRow
                label="Carbohidratos"
                value={`${(selectedFood.carbs_g * mult).toFixed(1)} g`}
              />
              <StatRow
                label="Grasas"
                value={`${(selectedFood.fat_g * mult).toFixed(1)} g`}
              />
            </SystemPanel>

            <SystemButton
              title="Agregar a mis comidas"
              variant="gradient"
              loading={saving}
              onPress={handleAddMeal}
            />
          </SystemWindowPanel>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 80 },

  header: { gap: spacing.sm },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' },

  mealTypeRow: { flexDirection: 'row', gap: spacing.xs },
  mealPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: radius.pill, borderWidth: 2,
    borderColor: colors.panelBorder,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  mealDot: { width: 8, height: 8, borderRadius: 4 },
  mealPillText: { fontSize: 12, fontWeight: '700' },

  resultsPanel: { gap: spacing.sm },
  resultsLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  foodRowSelected: { backgroundColor: gradients.brand[0] + '20', borderWidth: 1, borderColor: gradients.brand[0] + '40' },
  foodName: { fontSize: 15, fontWeight: '600', color: colors.text },
  foodMeta: { fontSize: 12, marginTop: 3 },
  separator: { height: 1, backgroundColor: colors.panelBorder },

  aiResults: { gap: spacing.sm },

  barcodeBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    width: 56, height: 56,
  },

  favToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.warning + '40', backgroundColor: colors.warning + '0F',
  },

  manualCtaGradient: {
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.glow + '50',
    marginVertical: spacing.md, overflow: 'hidden',
  },
  manualCta: {
    paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    alignItems: 'center', gap: 6,
  },
  macroInputRow: { flexDirection: 'row', gap: spacing.sm },
  macroInputCell: { flex: 1, gap: 6 },
  macroInputLabel: { fontSize: 11, letterSpacing: 0.5 },
  manualPreview: {
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', gap: 4,
  },

  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.panelBorder, backgroundColor: 'transparent',
  },
  catPillText: { fontSize: 12, fontWeight: '600' },

  subPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: colors.bgElevated,
  },
  subPillActive: { backgroundColor: colors.accent + '2A' },
  subPillText: { fontSize: 11, fontWeight: '600' },

  selectedCard: { gap: spacing.md },
  selectedName: { fontSize: 24, fontWeight: '900' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyUnit: { fontSize: 15, fontWeight: '700', width: 20 },
  nutritionBox: { padding: spacing.md },
});
