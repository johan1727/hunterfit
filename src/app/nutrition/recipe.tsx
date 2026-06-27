import React, { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, SafeAreaView, Pressable, Alert,
  StyleSheet, Dimensions, TextInput, FlatList, ActivityIndicator, Image,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeInUp, withSpring, withRepeat, withTiming, withSequence,
  useAnimatedStyle, useSharedValue, interpolate, Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { useRecipeAI } from '../../hooks/useRecipeAI';
import { useFavoriteRecipes } from '../../lib/favoriteRecipesStore';
import { usePreferencesStore } from '../../lib/preferencesStore';
import { useRecipeHistoryStore } from '../../lib/recipeHistoryStore';
import { shareRecipe } from '../../utils/shareRecipe';
import { GradientText, SystemText, AuroraBackground } from '../../components/system';
import { CookingBottomSheet } from '../../components/CookingBottomSheet';
import { RecipeCardSkeleton } from '../../components/RecipeSkeleton';
import { FoodDetailBottomSheet } from '../../components/FoodDetailBottomSheet';
import { colors, spacing, gradients, radius } from '../../theme/system';
import { supabase } from '../../lib/supabase';
import { askRecipeQuestion, type GeneratedRecipe } from '../../services/recipeAI';

const { width: SCREEN_W } = Dimensions.get('window');

function isImageUrl(icon?: string): boolean {
  return !!icon && (icon.startsWith('http://') || icon.startsWith('https://'));
}

// Si el icon es una URL (potencialmente muerta) usamos un emoji genérico para texto
function iconToEmoji(icon?: string): string {
  if (!icon || isImageUrl(icon)) return '🍽️';
  return icon;
}

// Renderiza imagen real con fallback a emoji si la URL falla
function FoodIcon({ icon, size, emojiSize, radius: r }: {
  icon?: string; size: number; emojiSize: number; radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (icon && isImageUrl(icon) && !failed) {
    return (
      <Image
        source={{ uri: icon }}
        style={{ width: size, height: size, borderRadius: r ?? 8 }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <SystemText style={{ fontSize: emojiSize }}>{iconToEmoji(icon)}</SystemText>;
}
const HERO_H = 280;
const CARD_W = SCREEN_W - spacing.lg * 2;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_STORIES: Array<{ type: MealType; emoji: string; label: string }> = [
  { type: 'breakfast', emoji: '🌅', label: 'Desayuno' },
  { type: 'lunch',     emoji: '☀️', label: 'Almuerzo' },
  { type: 'dinner',   emoji: '🌙', label: 'Cena' },
  { type: 'snack',    emoji: '⚡', label: 'Snack' },
];

const MEAL_MACROS: Record<MealType, { kcal: number; protein: number; carbs: number; fat: number }> = {
  breakfast: { kcal: 500, protein: 40, carbs: 60, fat: 15 },
  lunch:     { kcal: 700, protein: 60, carbs: 85, fat: 22 },
  dinner:    { kcal: 650, protein: 55, carbs: 75, fat: 20 },
  snack:     { kcal: 200, protein: 15, carbs: 25, fat: 7 },
};

const DIFFICULTY_LABEL = { fácil: 'Fácil', moderado: 'Moderado', difícil: 'Difícil' };

const AI_SUGGESTIONS = [
  '¿Puedo sustituir algún ingrediente?',
  '¿Cómo almacenar las sobras?',
  '¿Versión vegetariana?',
];

// ---------------------------------------------------------------------------
// Animated background — orbs flotantes con spring
function AuroraOrbs() {
  const y1 = useSharedValue(0);
  const y2 = useSharedValue(0);
  const y3 = useSharedValue(0);

  useEffect(() => {
    y1.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    y2.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 4100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4100, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    y3.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: y1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: y2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: y3.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.orb, styles.orb1, s1]} />
      <Animated.View style={[styles.orb, styles.orb2, s2]} />
      <Animated.View style={[styles.orb, styles.orb3, s3]} />
    </View>
  );
}

// Botón Generar con pulso de energía constante
function GenerateButton({ onPress, isGenerating }: { onPress: () => void; isGenerating: boolean }) {
  const pulse = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isGenerating) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ), -1, false
      );
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.linear }),
        -1, false
      );
    } else {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 400 }),
          withTiming(0.98, { duration: 400 }),
        ), -1, true
      );
    }
  }, [isGenerating]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: interpolate(pulse.value, [1, 1.04], [0.4, 0.8]),
  }));

  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12 }); };

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.generateWrap, pulseStyle, pressStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isGenerating}
        style={{ borderRadius: radius.pill, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={gradients.brand}
          style={styles.generateBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons
            name={isGenerating ? 'sync' : 'sparkles'}
            size={20}
            color="#fff"
            style={isGenerating ? styles.spinIcon : undefined}
          />
          <SystemText style={styles.generateBtnText}>
            {isGenerating ? 'Generando recetas...' : 'Generar Recetas con IA'}
          </SystemText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StoryCircle({
  item, selected, onPress,
}: {
  item: typeof MEAL_STORIES[0]; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.storyWrap}>
      <LinearGradient
        colors={selected ? gradients.brand : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
        style={styles.storyRing}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.storyInner, selected && { backgroundColor: colors.bg }]}>
          <SystemText style={styles.storyEmoji}>{item.emoji}</SystemText>
        </View>
      </LinearGradient>
      <SystemText
        style={[styles.storyLabel, selected && { color: colors.glow }]}
        dim={!selected}
      >
        {item.label}
      </SystemText>
    </Pressable>
  );
}

function RecipeHero({ recipe, onFav, isFav }: {
  recipe: GeneratedRecipe; onFav: () => void; isFav: boolean;
}) {
  const topIcon = recipe.foods?.[0]?.icon;
  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.heroCard}>
      <LinearGradient
        colors={['#0C1235', '#1A0B2E', '#07080B']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Glow orbs */}
      <View style={[styles.glowOrb, { top: 20, left: 30, backgroundColor: '#5B7CFF33' }]} />
      <View style={[styles.glowOrb, { top: 60, right: 20, backgroundColor: '#C084FC22', width: 120, height: 120 }]} />

      {/* Top bar */}
      <View style={styles.heroTopBar}>
        <View style={styles.difficultyPill}>
          <SystemText style={{ fontSize: 10, fontWeight: '700', color: colors.glow, letterSpacing: 1 }}>
            {DIFFICULTY_LABEL[recipe.difficulty]?.toUpperCase() ?? 'FÁCIL'}
          </SystemText>
        </View>
        <Pressable onPress={onFav} style={styles.favBtn} hitSlop={12}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={22}
            color={isFav ? '#FB7185' : colors.text}
          />
        </Pressable>
      </View>

      {/* Hero image o emoji */}
      <View style={styles.heroEmojiWrap}>
        <FoodIcon icon={topIcon} size={140} emojiSize={88} radius={24} />
      </View>

      {/* Title overlay */}
      <View style={styles.heroBottom}>
        <LinearGradient
          colors={['transparent', 'rgba(7,8,11,0.95)']}
          style={StyleSheet.absoluteFill}
        />
        <GradientText style={styles.heroTitle} colors={['#F4F6FB', '#C084FC'] as [string, string]}>
          {recipe.title}
        </GradientText>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Dificultad', value: DIFFICULTY_LABEL[recipe.difficulty] ?? '—' },
            { label: 'Prep',       value: `${recipe.prepTime} min` },
            { label: 'Calorías',   value: `${recipe.totalKcal} kcal` },
            { label: 'Proteína',   value: `${recipe.totalProtein}g` },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <SystemText dim style={{ fontSize: 10, letterSpacing: 0.5 }}>{label}</SystemText>
              <SystemText style={{ fontSize: 13, fontWeight: '700' }}>{value}</SystemText>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function ActionButtons({
  onCook, onLog, onShare,
}: { onCook: () => void; onLog: () => void; onShare?: () => void }) {
  return (
    <View style={styles.actionRow}>
      <Pressable onPress={onLog} style={styles.actionBtnPrimary}>
        <LinearGradient
          colors={gradients.brand}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Ionicons name="flame" size={16} color="#fff" />
        <SystemText style={styles.actionBtnText}>Registrar</SystemText>
      </Pressable>
      <Pressable onPress={onCook} style={styles.actionBtnGhost}>
        <Ionicons name="book-outline" size={16} color={colors.glow} />
        <SystemText style={[styles.actionBtnText, { color: colors.glow }]}>Plan</SystemText>
      </Pressable>
      {onShare && (
        <Pressable onPress={onShare} style={styles.actionBtnGhost}>
          <Ionicons name="share-social-outline" size={16} color={colors.textDim} />
          <SystemText style={[styles.actionBtnText, { color: colors.textDim }]}>Compartir</SystemText>
        </Pressable>
      )}
    </View>
  );
}

function AskHunterAI({ recipe }: { recipe: GeneratedRecipe }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async (q?: string) => {
    const text = q ?? question;
    if (!text.trim()) return;
    setIsAsking(true);
    setAnswer('');
    try {
      const res = await askRecipeQuestion(text, recipe);
      setAnswer(res);
      setQuestion('');
    } catch {
      setAnswer('No pude responder eso. Intenta de nuevo.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginTop: spacing.lg }}>
      <LinearGradient
        colors={['#1E1060', '#2A0845', '#0B0810']}
        style={styles.aiCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.aiCardHeader}>
          <LinearGradient
            colors={gradients.brand}
            style={styles.aiStarBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="sparkles" size={14} color="#fff" />
          </LinearGradient>
          <GradientText style={{ fontSize: 16, fontWeight: '800' }}>
            Pregunta al Hunter AI
          </GradientText>
        </View>

        {/* Sugerencias — ocultar si ya hay respuesta */}
        {!answer && AI_SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => handleAsk(s)}
            style={styles.aiSuggestion}
            disabled={isAsking}
          >
            <SystemText style={{ fontSize: 13 }}>{s}</SystemText>
          </Pressable>
        ))}

        {/* Respuesta */}
        {isAsking && (
          <View style={styles.aiAnswerBox}>
            <ActivityIndicator size="small" color={colors.glow} />
            <SystemText dim style={{ fontSize: 13, marginLeft: spacing.sm }}>Consultando al Hunter AI...</SystemText>
          </View>
        )}
        {answer ? (
          <View style={styles.aiAnswerBox}>
            <Ionicons name="sparkles" size={14} color={colors.glow} style={{ marginTop: 2 }} />
            <SystemText style={{ fontSize: 14, lineHeight: 22, flex: 1 }}>{answer}</SystemText>
          </View>
        ) : null}
        {answer ? (
          <Pressable onPress={() => { setAnswer(''); setQuestion(''); }} style={styles.aiSuggestion}>
            <SystemText dim style={{ fontSize: 12 }}>↩ Hacer otra pregunta</SystemText>
          </Pressable>
        ) : null}

        <View style={styles.aiInputRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={colors.textFaint}
            style={styles.aiInput}
            onSubmitEditing={() => handleAsk()}
            returnKeyType="send"
            editable={!isAsking}
          />
          <Pressable onPress={() => handleAsk()} disabled={isAsking || !question.trim()} style={[styles.aiSendBtn, (!question.trim() || isAsking) && { opacity: 0.4 }]}>
            <LinearGradient
              colors={gradients.brand}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function RecipeCarouselDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <LinearGradient
          key={i}
          colors={i === active ? gradients.brand : ['#333', '#333']}
          style={[styles.dot, i === active && { width: 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function RecipeScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showSteps, setShowSteps] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const { addFavorite, isFavorited } = useFavoriteRecipes();
  const { hasCompletedOnboarding, selectedCategories } = usePreferencesStore();
  const { history, addToHistory } = useRecipeHistoryStore();
  const flatRef = useRef<FlatList>(null);
  const hasRedirected = useRef(false);
  const [displayRecipes, setDisplayRecipes] = useState<GeneratedRecipe[] | null>(null);

  useEffect(() => {
    if (!hasCompletedOnboarding && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/nutrition/preferences' as any);
    }
  }, [hasCompletedOnboarding]);

  const mealMacros = MEAL_MACROS[mealType];
  const { generateMultiple, recipes, isGenerating, error } = useRecipeAI({
    userCalories: mealMacros.kcal,
    userProtein: mealMacros.protein,
    userCarbs: mealMacros.carbs,
    userFat: mealMacros.fat,
    mealType,
    cuisine: 'latinoamericano',
    preferences: selectedCategories.length > 0 ? selectedCategories : undefined,
  });

  const activeRecipes = displayRecipes ?? recipes;
  const selectedRecipe = activeRecipes?.[selectedIdx];

  const handleGenerate = () => {
    if (!userId) { Alert.alert('Error', 'Debes estar autenticado'); return; }
    setDisplayRecipes(null);
    generateMultiple(3, {
      onSuccess: (generated) => {
        if (generated?.length) addToHistory(generated);
      },
    });
    setSelectedIdx(0);
  };

  const handleLogMeal = async () => {
    if (!selectedRecipe || !userId) return;
    try {
      const { error: e } = await supabase.from('meal_logs').insert({
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
      if (e) throw e;
      Alert.alert('✅ Registrado', 'Comida añadida a tu historial');
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo registrar la comida');
    }
  };

  const scrollToCard = (idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setSelectedIdx(idx);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <AuroraOrbs />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <GradientText style={styles.headerTitle}>RecipeAI</GradientText>
          <Pressable onPress={() => router.push('/nutrition/preferences')} style={styles.headerRight} hitSlop={8}>
            <Ionicons name="options-outline" size={22} color={colors.textDim} />
          </Pressable>
        </Animated.View>

        {/* ── Meal type stories ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesRow}
          >
            {MEAL_STORIES.map((item) => (
              <StoryCircle
                key={item.type}
                item={item}
                selected={mealType === item.type}
                onPress={() => { setMealType(item.type); setSelectedIdx(0); }}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Generate CTA — pulso de energía ── */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <GenerateButton onPress={handleGenerate} isGenerating={isGenerating} />
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInDown.springify()} style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color="#FB7185" />
            <SystemText style={{ color: '#FB7185', fontSize: 13, flex: 1 }}>
              {(error as any)?.message?.replace('RecipeAI Error: ', '') ?? 'Error al generar recetas. Verifica tu conexión.'}
            </SystemText>
            <Pressable
              onPress={handleGenerate}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FB718520' }}
            >
              <SystemText style={{ color: '#FB7185', fontSize: 12, fontWeight: '700' }}>Reintentar</SystemText>
            </Pressable>
          </Animated.View>
        )}

        {/* Skeleton mientras genera */}
        {isGenerating && (!recipes || recipes.length === 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md, gap: 16 }}>
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
          </ScrollView>
        )}

        {/* ── Recipe cards ── */}
        {activeRecipes && activeRecipes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            {/* Horizontal scroll of recipe cards */}
            <FlatList
              ref={flatRef}
              data={activeRecipes}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(r) => r.id}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
                setSelectedIdx(idx);
              }}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeInDown.delay(index * 80).springify().damping(16)}
                  style={{ width: CARD_W, marginRight: spacing.lg }}
                >
                  <RecipeHero
                    recipe={item}
                    isFav={isFavorited(item.id)}
                    onFav={() => {
                      addFavorite(item);
                      Alert.alert('❤️', 'Guardada en favoritos');
                    }}
                  />
                </Animated.View>
              )}
              contentContainerStyle={{ paddingRight: spacing.lg }}
              style={{ marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg }}
              snapToInterval={CARD_W + spacing.lg}
              decelerationRate="fast"
            />

            {/* Dots */}
            <RecipeCarouselDots count={activeRecipes.length} active={selectedIdx} />

            {/* Recipe tabs (mini) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
            >
              {activeRecipes.map((r, i) => (
                <Pressable
                  key={r.id}
                  onPress={() => scrollToCard(i)}
                  style={[styles.recipePill, i === selectedIdx && styles.recipePillActive]}
                >
                  <SystemText style={{ fontSize: 12, fontWeight: i === selectedIdx ? '700' : '400' }}>
                    {iconToEmoji(r.foods?.[0]?.icon)} {r.title.split(' ').slice(0, 3).join(' ')}
                  </SystemText>
                </Pressable>
              ))}
            </ScrollView>

            {selectedRecipe && (
              <>
                {/* Action buttons */}
                <ActionButtons
                  onCook={() => setShowSteps(true)}
                  onLog={handleLogMeal}
                  onShare={() => selectedRecipe && shareRecipe(selectedRecipe)}
                />

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.descCard}>
                  <SystemText style={{ fontSize: 14, lineHeight: 22 }} dim>
                    {selectedRecipe.description}
                  </SystemText>
                </Animated.View>

                {/* Macro chips */}
                <View style={styles.macroChips}>
                  {[
                    { label: 'Proteína', value: `${selectedRecipe.totalProtein}g`, pct: selectedRecipe.macroPercentages.protein, color: '#FF6B6B' },
                    { label: 'Carbos',   value: `${selectedRecipe.totalCarbs}g`,   pct: selectedRecipe.macroPercentages.carbs,   color: '#4ECDC4' },
                    { label: 'Grasas',   value: `${selectedRecipe.totalFat}g`,     pct: selectedRecipe.macroPercentages.fat,     color: '#FFD93D' },
                  ].map(({ label, value, pct, color }) => (
                    <View key={label} style={styles.macroChip}>
                      <View style={[styles.macroBar, { backgroundColor: color + '30' }]}>
                        <View style={[styles.macroBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                      <SystemText style={{ fontSize: 13, fontWeight: '700', color }}>{value}</SystemText>
                      <SystemText dim style={{ fontSize: 11 }}>{label} · {pct}%</SystemText>
                    </View>
                  ))}
                </View>

                {/* Ingredients */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="restaurant-outline" size={16} color={colors.glow} />
                    <SystemText style={styles.sectionTitle}>Ingredientes</SystemText>
                  </View>
                  {selectedRecipe.foods.map((food, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedFood(food)}
                      style={styles.ingredientRow}
                    >
                      <View style={styles.ingredientEmojiBubble}>
                        <FoodIcon icon={food.icon} size={36} emojiSize={22} radius={8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <SystemText style={{ fontSize: 13, fontWeight: '600' }}>{food.name_es}</SystemText>
                        <SystemText dim style={{ fontSize: 11, marginTop: 2 }}>
                          {food.quantity_g}g · {food.kcal} kcal · {food.protein_g}g prot
                        </SystemText>
                      </View>
                      <View style={styles.ingredientKcalBadge}>
                        <SystemText style={{ fontSize: 11, color: colors.glow }}>{food.kcal}</SystemText>
                        <SystemText dim style={{ fontSize: 9 }}>kcal</SystemText>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Ver pasos — abre bottom sheet */}
                {selectedRecipe.steps.length > 0 && (
                  <Pressable onPress={() => setShowSteps(true)} style={styles.stepsPreviewBtn}>
                    <Ionicons name="time-outline" size={16} color={colors.glow} />
                    <SystemText style={{ fontSize: 14, color: colors.glow, fontWeight: '700' }}>
                      Ver preparación · {selectedRecipe.prepTime} min
                    </SystemText>
                    <Ionicons name="chevron-up" size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
                  </Pressable>
                )}

                {/* Ask AI */}
                <AskHunterAI recipe={selectedRecipe} />

                <View style={{ height: 60 }} />
              </>
            )}
          </Animated.View>
        )}

      {/* Bottom Sheets — fuera del ScrollView, dentro del SafeAreaView */}
      {selectedRecipe && (
        <CookingBottomSheet
          isOpen={showSteps}
          onClose={() => setShowSteps(false)}
          steps={selectedRecipe.steps}
          prepTime={selectedRecipe.prepTime}
          title={selectedRecipe.title}
        />
      )}

      {selectedFood && (
        <FoodDetailBottomSheet
          isOpen={!!selectedFood}
          onClose={() => setSelectedFood(null)}
          food={selectedFood}
        />
      )}

        {/* Historial de recetas */}
        {!isGenerating && history.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <SystemText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                🕐 Recetas anteriores
              </SystemText>
              <SystemText dim style={{ fontSize: 12 }}>{history.length} recetas</SystemText>
            </View>
            <View style={[styles.sectionCard, { gap: 0 }]}>
              {history.slice(0, 5).map((recipe, i) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => {
                    setDisplayRecipes([recipe]);
                    setSelectedIdx(0);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                    paddingVertical: 12,
                    borderBottomWidth: i < Math.min(history.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: colors.panelBorder,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#5B7CFF18', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <FoodIcon icon={recipe.foods?.[0]?.icon} size={40} emojiSize={18} radius={10} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SystemText style={{ fontSize: 13, fontWeight: '600' }}>{recipe.title}</SystemText>
                    <SystemText dim style={{ fontSize: 11 }}>
                      {recipe.totalKcal} kcal · {recipe.prepTime} min · {recipe.difficulty}
                    </SystemText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Empty state */}
        {!isGenerating && (!activeRecipes || activeRecipes.length === 0) && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
            <SystemText style={{ fontSize: 64 }}>✨</SystemText>
            <GradientText style={{ fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: spacing.md }}>
              Tu Hunter Chef
            </GradientText>
            <SystemText dim style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 14, lineHeight: 22 }}>
              Genera recetas personalizadas con IA{'\n'}basadas en tus macros del día
            </SystemText>
            <Pressable
              onPress={() => router.push('/nutrition/recipes')}
              style={{
                marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.pill,
                borderWidth: 1, borderColor: colors.panelBorder, backgroundColor: colors.bgElevated,
              }}
            >
              <Ionicons name="book-outline" size={16} color={colors.textDim} />
              <SystemText dim style={{ fontSize: 13 }}>Ver recetas guardadas →</SystemText>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  headerRight: { width: 36 },

  // Stories
  storiesRow: { paddingVertical: spacing.sm, gap: spacing.md, paddingRight: spacing.md },
  storyWrap: { alignItems: 'center', gap: 6 },
  storyRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5 },
  storyInner: { flex: 1, borderRadius: 30, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  storyEmoji: { fontSize: 26 },
  storyLabel: { fontSize: 11, fontWeight: '600' },

  // Generate button con pulso
  generateWrap: {
    marginVertical: spacing.md,
    shadowColor: '#5B7CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 12,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill,
  },
  generateBtnText: { fontWeight: '900', fontSize: 16, color: '#fff', letterSpacing: 0.3 },
  spinIcon: { },

  // Aurora orbs animados
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 220, height: 220, top: 60, left: -60, backgroundColor: '#5B7CFF18' },
  orb2: { width: 180, height: 180, top: 300, right: -40, backgroundColor: '#C084FC14' },
  orb3: { width: 140, height: 140, top: 600, left: 40, backgroundColor: '#FB718512' },

  // Error
  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: spacing.sm, padding: 14, borderRadius: 12,
    backgroundColor: '#FB718510', borderWidth: 1, borderColor: '#FB718540',
  },

  // Hero card
  heroCard: {
    height: HERO_H, borderRadius: radius.lg, overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  difficultyPill: { backgroundColor: 'rgba(90,124,255,0.18)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '50' },
  favBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  glowOrb: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  heroEmojiWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 88 },
  heroBottom: { padding: spacing.md, paddingTop: 40 },
  heroTitle: { fontSize: 22, fontWeight: '900', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', gap: 2 },

  // Dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginVertical: spacing.sm },
  dot: { height: 4, width: 8, borderRadius: 2 },

  // Recipe pills
  recipePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.panelBorder },
  recipePillActive: { borderColor: colors.primary },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  actionBtnPrimary: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: radius.pill, overflow: 'hidden',
  },
  actionBtnGhost: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: radius.pill,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.panelBorder,
  },
  actionBtnText: { fontWeight: '700', fontSize: 14, color: '#fff' },

  // Description
  descCard: {
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.panelBorder,
  },

  // Macros
  macroChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  macroChip: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.sm, gap: 4, borderWidth: 1, borderColor: colors.panelBorder },
  macroBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  macroBarFill: { height: '100%', borderRadius: 2 },

  // Section cards
  sectionCard: {
    backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.panelBorder,
    gap: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },

  // Ingredients
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.panelBorder },
  ingredientEmojiBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  ingredientKcalBadge: { alignItems: 'center', minWidth: 36 },

  // AI card
  aiCard: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: '#5B7CFF30' },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  aiStarBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiSuggestion: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  aiInputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  aiInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 14 },
  aiSendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Steps preview button
  stepsPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.primary + '44',
  },

  // AI answer
  aiAnswerBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: 'rgba(90,124,255,0.1)', borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30',
  },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
});
