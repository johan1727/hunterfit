import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useHunterData } from '../../hooks/useHunterData';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, ProgressBar,
  SystemPanel, SystemText, SystemButton,
} from '../../components/system';

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

export default function NutritionScreen() {
  const router = useRouter();
  const { profile, meals, isDemo } = useHunterData();

  if (!profile) return null;

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

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pill dotColor={colors.warning}>Hoy · {today}</Pill>
          <GradientText
            style={styles.title}
            colors={['#FB7185', '#FBBF24', '#5B7CFF']}
          >
            Nutrición
          </GradientText>
        </View>

        {/* Hero: calorías */}
        <SystemPanel>
          <View style={styles.kcalRow}>
            {/* Círculo */}
            <View style={styles.ringWrap}>
              <LinearGradient
                colors={kcalPct >= 1 ? [colors.success, colors.success] : gradients.brand}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.ringOuter}
              >
                <View style={styles.ringInner}>
                  <Text style={styles.ringKcal}>{totals.kcal}</Text>
                  <Text style={styles.ringLabel}>kcal</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Info */}
            <View style={{ flex: 1, gap: 8 }}>
              <InfoKcal label="Meta" value={`${targets.kcal} kcal`} />
              <InfoKcal label="Restante" value={`${remaining} kcal`} accent={remaining < 200 ? colors.success : colors.text} />
              <ProgressBar progress={kcalPct} height={6} />
            </View>
          </View>
        </SystemPanel>

        {/* Macros */}
        <SystemPanel>
          <SystemText style={styles.sectionLabel}>Macronutrientes</SystemText>
          <MacroRow label="Proteína" current={totals.protein} target={targets.protein} unit="g" color={MACRO_COLORS.protein} />
          <MacroRow label="Carbohidratos" current={totals.carbs} target={targets.carbs} unit="g" color={MACRO_COLORS.carbs} />
          <MacroRow label="Grasas" current={totals.fat} target={targets.fat} unit="g" color={MACRO_COLORS.fat} />
        </SystemPanel>

        {/* Comidas por tipo */}
        {(['desayuno', 'comida', 'cena', 'snack'] as const).map((type) => {
          const typeMeals = mealsByType[type];
          const typeKcal = Math.round(typeMeals.reduce((s, m) => s + m.kcal, 0));
          return (
            <View key={type} style={styles.mealSection}>
              {/* Cabecera de sección */}
              <Pressable
                style={styles.mealHeader}
                onPress={() => !isDemo && router.push(`/nutrition/add?type=${type}`)}
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
          );
        })}

        {/* CTA buscar */}
        {!isDemo ? (
          <SystemButton
            title="Buscar alimento"
            variant="gradient"
            onPress={() => router.push('/nutrition/search')}
            style={{ marginTop: spacing.sm }}
          />
        ) : (
          <SystemPanel style={{ alignItems: 'center', gap: spacing.sm }}>
            <SystemText dim style={{ fontSize: 13, textAlign: 'center' }}>
              Registro de alimentos disponible con cuenta
            </SystemText>
          </SystemPanel>
        )}

      </ScrollView>
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

  header: { gap: 6, marginBottom: spacing.sm },
  title: { fontSize: 38, lineHeight: 40 },

  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ringWrap: { flexShrink: 0 },
  ringOuter: { width: 90, height: 90, borderRadius: 45, padding: 3 },
  ringInner: {
    flex: 1, borderRadius: 42, backgroundColor: colors.panel,
    alignItems: 'center', justifyContent: 'center',
  },
  ringKcal: { color: colors.text, fontSize: 20, fontWeight: '900' },
  ringLabel: { color: colors.textDim, fontSize: 10, marginTop: 1 },

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
});
