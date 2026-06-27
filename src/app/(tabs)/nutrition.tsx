import { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useHunterData } from '../../hooks/useHunterData';
import { useWaterToday, useAddWater, useCopyYesterday, useMealLogs } from '../../hooks/useData';
import { localDateString } from '../../lib/dates';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, ProgressBar,
  SystemPanel, SystemText, SystemButton,
} from '../../components/system';
import { FAB } from '../../components/FAB';
import { MenuList } from '../../components/MenuList';
import { CalorieRing } from '../../components/CalorieRing';

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  snack: 'Snack',
};

const MACRO_COLORS = {
  protein: colors.danger,
  carbs: colors.warning,
  fat: colors.accent,
};

const WATER_GOAL_ML = 2500;

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function NutritionScreen() {
  const router = useRouter();
  const { profile, meals: demoMeals, isDemo, userId } = useHunterData();
  const isRealDemo = isDemo;
  const today = localDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  // Meals para la fecha seleccionada (real) o demo
  const { data: realMeals = [] } = useMealLogs(isDemo ? null : userId, selectedDate);
  const meals = isDemo ? demoMeals : realMeals;

  const waterQuery = useWaterToday(isDemo ? null : userId, selectedDate);
  const addWater = useAddWater(isDemo ? null : userId, selectedDate);
  const copyYesterday = useCopyYesterday(isDemo ? null : userId, selectedDate);
  const [copyingYesterday, setCopyingYesterday] = useState(false);

  const waterMl = waterQuery.data ?? 0;
  const waterPct = Math.min(1, waterMl / WATER_GOAL_ML);

  async function handleCopyYesterday() {
    setCopyingYesterday(true);
    try {
      const n = await copyYesterday.mutateAsync();
      Alert.alert('¡Listo!', `Se copiaron ${n} alimentos de ayer`);
    } catch (e: any) {
      Alert.alert('Sin datos', e?.message ?? 'No hay comidas de ayer para copiar');
    } finally {
      setCopyingYesterday(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <GradientText style={{ fontSize: 22 }}>Nutrición</GradientText>
          <SystemText dim style={{ marginTop: 8 }}>Cargando…</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  const targets = {
    kcal: profile.calorie_target ?? 2000,
    protein: profile.protein_g ?? 150,
    carbs: profile.carbs_g ?? 200,
    fat: profile.fat_g ?? 65,
  };

  const totals = {
    kcal: Math.round(meals.reduce((s, m) => s + m.kcal, 0)),
    protein: Math.round(meals.reduce((s, m) => s + m.protein_g, 0)),
    carbs: Math.round(meals.reduce((s, m) => s + m.carbs_g, 0)),
    fat: Math.round(meals.reduce((s, m) => s + m.fat_g, 0)),
  };

  const remaining = Math.max(0, targets.kcal - totals.kcal);
  const kcalPct = Math.min(1, totals.kcal / targets.kcal);

  const mealsByType = {
    desayuno: meals.filter((m) => m.meal_type === 'desayuno'),
    comida:   meals.filter((m) => m.meal_type === 'comida'),
    cena:     meals.filter((m) => m.meal_type === 'cena'),
    snack:    meals.filter((m) => m.meal_type === 'snack'),
  };


  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <GradientText
            style={styles.title}
            colors={['#FB7185', '#FBBF24', '#5B7CFF']}
          >
            Nutrición
          </GradientText>
          {/* Navegación de fechas */}
          <View style={styles.dateNav}>
            <Pressable
              onPress={() => setSelectedDate((d) => offsetDate(d, -1))}
              style={({ pressed }) => [styles.dateArrow, pressed && { opacity: 0.5 }]}
            >
              <Text style={styles.dateArrowText}>‹</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedDate(today)} style={styles.datePill}>
              <Text style={styles.datePillText}>
                {isToday ? 'Hoy' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => !isToday && setSelectedDate((d) => offsetDate(d, 1))}
              style={({ pressed }) => [styles.dateArrow, pressed && { opacity: 0.5 }, isToday && { opacity: 0.25 }]}
              disabled={isToday}
            >
              <Text style={styles.dateArrowText}>›</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Hero: calorías */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
        <SystemPanel>
          <View style={styles.kcalRow}>
            <CalorieRing consumed={totals.kcal} target={targets.kcal} size={120} />

            {/* Info */}
            <View style={{ flex: 1, gap: 8 }}>
              <InfoKcal label="Meta" value={`${targets.kcal} kcal`} />
              <InfoKcal label="Restante" value={`${remaining} kcal`} accent={remaining < 200 ? colors.success : colors.text} />
              <ProgressBar progress={kcalPct} height={6} />
            </View>
          </View>
        </SystemPanel>
        </Animated.View>

        {/* Macros */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
        <SystemPanel>
          <SystemText style={styles.sectionLabel}>Macronutrientes</SystemText>
          <MacroRow label="Proteína" current={totals.protein} target={targets.protein} unit="g" color={MACRO_COLORS.protein} />
          <MacroRow label="Carbohidratos" current={totals.carbs} target={targets.carbs} unit="g" color={MACRO_COLORS.carbs} />
          <MacroRow label="Grasas" current={totals.fat} target={targets.fat} unit="g" color={MACRO_COLORS.fat} />
        </SystemPanel>
        </Animated.View>

        {/* Agua */}
        {!isDemo && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SystemPanel style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SystemText style={{ fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.textFaint }}>
                  Hidratación
                </SystemText>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>
                  {waterMl} / {WATER_GOAL_ML} ml
                </Text>
              </View>
              <ProgressBar progress={waterPct} color={colors.accent} height={6} />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 4 }}>
                {[150, 250, 350, 500].map((ml) => (
                  <Pressable
                    key={ml}
                    onPress={() => addWater.mutate(ml)}
                    style={({ pressed }) => [styles.waterBtn, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.waterBtnText}>+{ml}</Text>
                  </Pressable>
                ))}
              </View>
            </SystemPanel>
          </Animated.View>
        )}

        {/* Copiar de ayer */}
        {!isDemo && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <Pressable
              onPress={handleCopyYesterday}
              disabled={copyingYesterday}
              style={({ pressed }) => [styles.copyYesterdayBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.copyYesterdayText}>
                {copyingYesterday ? 'Copiando…' : '↩ Copiar comidas de ayer'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Comidas por tipo */}
        {(['desayuno', 'comida', 'cena', 'snack'] as const).map((type, mealIdx) => {
          const typeMeals = mealsByType[type];
          const typeKcal = Math.round(typeMeals.reduce((s, m) => s + m.kcal, 0));
          return (
            <Animated.View key={type} entering={FadeInDown.delay(240 + mealIdx * 70).springify()}>
            <View style={styles.mealSection}>
              {/* Cabecera de sección */}
              <Pressable
                style={styles.mealHeader}
                onPress={() => !isDemo && router.push(`/nutrition/add?type=${type}&date=${selectedDate}`)}
              >
                <View>
                  <Text style={styles.mealType}>{MEAL_LABELS[type]}</Text>
                  <SystemText dim style={{ fontSize: 12 }}>{typeKcal} kcal</SystemText>
                </View>
                {!isDemo && (
                  <LinearGradient
                    colors={gradients.mana}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.addBtn}
                  >
                    <Text style={styles.addBtnText}>+ Agregar</Text>
                  </LinearGradient>
                )}
              </Pressable>

              {/* Items */}
              {typeMeals.length > 0 ? (
                typeMeals.map((meal) => (
                  <Pressable
                    key={meal.id}
                    style={styles.mealItem}
                    onPress={() => !isDemo && router.push(`/nutrition/edit/${meal.id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName}>{meal.custom_name ?? 'Comida'}</Text>
                      <Text style={styles.mealMacros}>
                        {Math.round(meal.protein_g)}g P · {Math.round(meal.carbs_g)}g C · {Math.round(meal.fat_g)}g G
                      </Text>
                    </View>
                    <Text style={styles.mealKcal}>{Math.round(meal.kcal)}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyMeal}>Sin registros</Text>
              )}
            </View>
            </Animated.View>
          );
        })}

        {/* CTA buscar + metas */}
        {!isDemo ? (
          <>
            <SystemButton
              title="Buscar alimento"
              variant="gradient"
              onPress={() => router.push(`/nutrition/search?date=${selectedDate}`)}
              style={{ marginTop: spacing.sm }}
            />
            <SystemButton
              title="🤖 Generar Receta con IA"
              onPress={() => router.push('/nutrition/recipe')}
              variant="gradient"
            />
            <MenuList
              title="Herramientas"
              items={[
                { icon: 'calendar-outline', label: 'Plan de comidas', onPress: () => router.push('/nutrition/meal-plan') },
                { icon: 'cart-outline', label: 'Lista de compras', iconColor: colors.success, onPress: () => router.push('/nutrition/shopping') },
                { icon: 'options-outline', label: 'Ajustar metas de macros', iconColor: colors.warning, onPress: () => router.push('/nutrition/macro-calc') },
                { icon: 'restaurant-outline', label: 'Recetas fit', iconColor: colors.danger, onPress: () => router.push('/nutrition/recipes' as any) },
              ]}
            />
          </>
        ) : (
          <SystemPanel style={{ alignItems: 'center', gap: spacing.sm }}>
            <SystemText dim style={{ fontSize: 13, textAlign: 'center' }}>
              Registro de alimentos disponible con cuenta
            </SystemText>
          </SystemPanel>
        )}

      </ScrollView>
      {!isRealDemo && <FAB onPress={() => router.push(`/nutrition/search?date=${selectedDate}`)} />}
    </SafeAreaView>
  );
}

function InfoKcal({ label, value, accent = colors.textDim }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <SystemText dim style={{ fontSize: 13 }}>{label}</SystemText>
      <Text style={{ color: accent, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function MacroRow({ label, current, target, unit, color }: { label: string; current: number; target: number; unit: string; color: string }) {
  return (
    <View style={macroStyles.row}>
      <View style={macroStyles.header}>
        <Text style={macroStyles.label}>{label}</Text>
        <Text style={[macroStyles.value, { color }]}>{current}{unit} / {target}{unit}</Text>
      </View>
      <ProgressBar progress={Math.min(1, current / target)} color={color} height={5} />
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: 100 },

  header: { gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 38, lineHeight: 40 },

  dateNav: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  dateArrow: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.panelBorder,
  },
  dateArrowText: { color: colors.text, fontSize: 20, fontWeight: '300', lineHeight: 24 },
  datePill: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bgElevated, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.panelBorder,
    minWidth: 100, alignItems: 'center',
  },
  datePillText: { color: colors.text, fontSize: 13, fontWeight: '700' },

  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: spacing.md },

  mealSection: {
    backgroundColor: colors.panel, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.panelBorder,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  mealHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder,
  },
  mealType: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addBtn: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  mealItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder,
  },
  mealName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  mealMacros: { color: colors.textDim, fontSize: 11, marginTop: 3 },
  mealKcal: { color: colors.glow, fontSize: 15, fontWeight: '800' },
  emptyMeal: { color: colors.textFaint, fontSize: 13, padding: spacing.md },

  waterBtn: {
    flex: 1, backgroundColor: colors.bgElevated,
    borderRadius: radius.md, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.panelBorder,
  },
  waterBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800' },

  copyYesterdayBtn: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: colors.panelBorder,
  },
  copyYesterdayText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
});
