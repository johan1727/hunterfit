import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { localDateString } from '../../lib/dates';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, SystemPanel, SystemText, SystemButton, SystemInput, SystemWindowPanel,
} from '../../components/system';
import { LinearGradient } from 'expo-linear-gradient';

type PlanItem = {
  id: string; date: string; meal_type: string; name: string;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number; logged: boolean;
};

const MEAL_TYPES = ['desayuno', 'comida', 'cena', 'snack'] as const;
const MEAL_LABELS: Record<string, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' };

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function useMealPlan(userId: string | null, date: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['meal_plan', userId, date],
    enabled: !!userId,
    queryFn: async (): Promise<PlanItem[]> => {
      const { data, error } = await supabase
        .from('meal_plans').select('*').eq('user_id', userId!).eq('date', date).order('meal_type');
      if (error) throw error;
      return data as PlanItem[];
    },
  });

  const add = useMutation({
    mutationFn: async (item: Omit<PlanItem, 'id' | 'logged'>) => {
      const { error } = await supabase.from('meal_plans').insert({ user_id: userId!, ...item, logged: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan', userId, date] }),
  });

  const logItem = useMutation({
    mutationFn: async ({ id, item }: { id: string; item: PlanItem }) => {
      // Marcar como logged en el plan y crear meal_log
      const [{ error: logErr }, { error: planErr }] = await Promise.all([
        supabase.from('meal_logs').insert({
          user_id: userId!, date: item.date, meal_type: item.meal_type,
          custom_name: item.name, quantity_g: 100,
          kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
          source: 'meal_plan',
        }),
        supabase.from('meal_plans').update({ logged: true }).eq('id', id),
      ]);
      if (logErr) throw logErr;
      if (planErr) throw planErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan', userId, date] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal_plan', userId, date] }),
  });

  return { query, add, logItem, remove };
}

export default function MealPlanScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const today = localDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const { query, add, logItem, remove } = useMealPlan(userId, selectedDate);
  const isToday = selectedDate === today;

  const [showForm, setShowForm] = useState<typeof MEAL_TYPES[number] | null>(null);
  const [formName, setFormName] = useState('');
  const [formKcal, setFormKcal] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  const items = query.data ?? [];
  const totalKcal = Math.round(items.reduce((s, i) => s + i.kcal, 0));
  const loggedKcal = Math.round(items.filter((i) => i.logged).reduce((s, i) => s + i.kcal, 0));

  async function handleAdd() {
    if (!showForm || !formName.trim() || !formKcal) return;
    await add.mutateAsync({
      date: selectedDate, meal_type: showForm, name: formName.trim(),
      kcal: parseFloat(formKcal) || 0,
      protein_g: parseFloat(formProtein) || 0,
      carbs_g: parseFloat(formCarbs) || 0,
      fat_g: parseFloat(formFat) || 0,
    });
    setFormName(''); setFormKcal(''); setFormProtein(''); setFormCarbs(''); setFormFat('');
    setShowForm(null);
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={gradients.brand[0]}>Plan</Pill>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <SystemText dim style={{ fontSize: 14 }}>← Atrás</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Plan de{'\n'}comidas</GradientText>
        </Animated.View>

        {/* Navegación de fecha */}
        <View style={styles.dateNav}>
          <Pressable onPress={() => setSelectedDate((d) => offsetDate(d, -1))} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedDate(today)} style={styles.datePill}>
            <Text style={styles.datePillText}>
              {isToday ? 'Hoy' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedDate((d) => offsetDate(d, 1))}
            style={[styles.dateArrow, selectedDate >= offsetDate(today, 7) && { opacity: 0.3 }]}
            disabled={selectedDate >= offsetDate(today, 7)}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>

        {/* Resumen de kcal planificadas */}
        {items.length > 0 && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <SystemPanel>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: gradients.brand[0], fontSize: 22, fontWeight: '900' }}>{totalKcal}</Text>
                  <SystemText dim style={{ fontSize: 11 }}>planificadas</SystemText>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.success, fontSize: 22, fontWeight: '900' }}>{loggedKcal}</Text>
                  <SystemText dim style={{ fontSize: 11 }}>registradas</SystemText>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.textFaint, fontSize: 22, fontWeight: '900' }}>{items.filter((i) => i.logged).length}/{items.length}</Text>
                  <SystemText dim style={{ fontSize: 11 }}>comidas</SystemText>
                </View>
              </View>
            </SystemPanel>
          </Animated.View>
        )}

        {/* Secciones por tipo */}
        {MEAL_TYPES.map((type, idx) => {
          const typeItems = items.filter((i) => i.meal_type === type);
          return (
            <Animated.View key={type} entering={FadeInDown.delay(80 + idx * 40).springify()}>
              <View style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealType}>{MEAL_LABELS[type]}</Text>
                  <Pressable onPress={() => setShowForm(showForm === type ? null : type)} style={styles.addBtn}>
                    <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
                      <Text style={styles.addBtnText}>+ Plan</Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Formulario inline */}
                {showForm === type && (
                  <View style={styles.form}>
                    <SystemInput placeholder="Nombre del alimento *" value={formName} onChangeText={setFormName} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <SystemInput placeholder="kcal *" value={formKcal} onChangeText={setFormKcal} keyboardType="decimal-pad" style={{ flex: 1 }} />
                      <SystemInput placeholder="Prot g" value={formProtein} onChangeText={setFormProtein} keyboardType="decimal-pad" style={{ flex: 1 }} />
                      <SystemInput placeholder="Carb g" value={formCarbs} onChangeText={setFormCarbs} keyboardType="decimal-pad" style={{ flex: 1 }} />
                      <SystemInput placeholder="Gras g" value={formFat} onChangeText={setFormFat} keyboardType="decimal-pad" style={{ flex: 1 }} />
                    </View>
                    <SystemButton title="Agregar al plan" variant="gradient" onPress={handleAdd} disabled={!formName || !formKcal} />
                  </View>
                )}

                {/* Items del plan */}
                {typeItems.map((item) => (
                  <View key={item.id} style={[styles.planItem, item.logged && styles.planItemLogged]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planItemName, item.logged && { color: colors.textFaint }]}>
                        {item.logged ? '✓ ' : ''}{item.name}
                      </Text>
                      <SystemText dim style={{ fontSize: 11 }}>
                        {Math.round(item.kcal)} kcal · {item.protein_g}P · {item.carbs_g}C · {item.fat_g}G
                      </SystemText>
                    </View>
                    {!item.logged ? (
                      <Pressable
                        onPress={() => logItem.mutate({ id: item.id, item })}
                        style={styles.logBtn}
                      >
                        <Text style={styles.logBtnText}>Registrar</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => remove.mutate(item.id)} hitSlop={8}>
                        <SystemText dim style={{ fontSize: 18 }}>×</SystemText>
                      </Pressable>
                    )}
                  </View>
                ))}

                {typeItems.length === 0 && (
                  <Text style={styles.empty}>Sin planificar</Text>
                )}
              </View>
            </Animated.View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: 100 },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 38, lineHeight: 40, fontWeight: '900' },

  dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  dateArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.panelBorder },
  dateArrowText: { color: colors.text, fontSize: 20, fontWeight: '300', lineHeight: 24 },
  datePill: { paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.bgElevated, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.panelBorder, minWidth: 100, alignItems: 'center' },
  datePillText: { color: colors.text, fontSize: 13, fontWeight: '700' },

  mealSection: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.panelBorder, overflow: 'hidden', marginBottom: 2 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder },
  mealType: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  addBtnGrad: { paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  form: { padding: spacing.md, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder },

  planItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder },
  planItemLogged: { opacity: 0.5 },
  planItemName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  logBtn: { backgroundColor: colors.success + '20', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.success + '40' },
  logBtnText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textFaint, fontSize: 13, padding: spacing.md },
});
