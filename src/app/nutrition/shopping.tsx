import { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { localDateString } from '../../lib/dates';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, SystemPanel, SystemText, SystemButton, SystemInput,
} from '../../components/system';

type ShoppingItem = { id: string; name: string; qty_g: number | null; checked: boolean; category: string };

const CATEGORIES = ['proteína', 'carbos', 'grasas', 'verduras', 'lácteos', 'general'] as const;

function useShoppingList(userId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['shopping', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ShoppingItem[]> => {
      const { data, error } = await supabase
        .from('shopping_items').select('*').eq('user_id', userId!).order('checked').order('category').order('name');
      if (error) throw error;
      return data as ShoppingItem[];
    },
  });

  const add = useMutation({
    mutationFn: async (item: { name: string; qty_g?: number; category: string }) => {
      const { error } = await supabase.from('shopping_items').insert({ user_id: userId!, ...item });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', userId] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await supabase.from('shopping_items').update({ checked }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', userId] }),
  });

  const clearChecked = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('shopping_items').delete().eq('user_id', userId!).eq('checked', true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', userId] }),
  });

  const importFromMeals = useMutation({
    mutationFn: async () => {
      const today = localDateString();
      const { data: meals, error } = await supabase
        .from('meal_logs').select('custom_name, quantity_g').eq('user_id', userId!).eq('date', today);
      if (error) throw error;
      if (!meals?.length) throw new Error('No hay comidas registradas hoy para importar');
      const inserts = meals.map((m: any) => ({
        user_id: userId!, name: m.custom_name ?? 'Alimento', qty_g: m.quantity_g, category: 'general',
      }));
      const { error: insErr } = await supabase.from('shopping_items').insert(inserts);
      if (insErr) throw insErr;
      return inserts.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', userId] }),
  });

  return { query, add, toggle, remove, clearChecked, importFromMeals };
}

export default function ShoppingListScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { query, add, toggle, remove, clearChecked, importFromMeals } = useShoppingList(userId);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('general');
  const [showAdd, setShowAdd] = useState(false);

  const items = query.data ?? [];
  const unchecked = items.filter((i) => !i.checked);
  const checked   = items.filter((i) =>  i.checked);

  async function handleAdd() {
    if (!newName.trim()) return;
    await add.mutateAsync({
      name: newName.trim(),
      qty_g: newQty ? parseFloat(newQty) : undefined,
      category: newCategory,
    });
    setNewName(''); setNewQty(''); setShowAdd(false);
  }

  async function handleImport() {
    try {
      const n = await importFromMeals.mutateAsync();
      Alert.alert('¡Listo!', `${n} alimentos importados de hoy`);
    } catch (e: any) {
      Alert.alert('Sin datos', e?.message ?? 'Error importando');
    }
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = unchecked.filter((i) => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={colors.success}>Compras</Pill>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <SystemText dim style={{ fontSize: 14 }}>← Atrás</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Lista de{'\n'}compras</GradientText>
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <SystemButton title="+ Agregar" variant="gradient" onPress={() => setShowAdd((v) => !v)} style={{ flex: 1 }} />
          <SystemButton
            title="↓ Importar de hoy"
            variant="ghost"
            loading={importFromMeals.isPending}
            onPress={handleImport}
            style={{ flex: 1 }}
          />
        </View>

        {/* Formulario agregar */}
        {showAdd && (
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <SystemPanel style={{ gap: spacing.sm }}>
              <SystemInput placeholder="Nombre del alimento" value={newName} onChangeText={setNewName} />
              <SystemInput placeholder="Cantidad en g (opcional)" value={newQty} onChangeText={setNewQty} keyboardType="decimal-pad" />
              {/* Categoría */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[styles.catPill, newCategory === cat && styles.catPillActive]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: newCategory === cat ? '#fff' : colors.textDim, textTransform: 'capitalize' }}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <SystemButton title="Agregar a la lista" variant="gradient" loading={add.isPending} onPress={handleAdd} />
            </SystemPanel>
          </Animated.View>
        )}

        {/* Items por categoría */}
        {Object.entries(grouped).map(([cat, catItems]) => (
          <Animated.View key={cat} entering={FadeInDown.delay(80).springify()}>
            <SystemText style={styles.catLabel}>{cat}</SystemText>
            <SystemPanel style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
              {catItems.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggle.mutate({ id: item.id, checked: !item.checked })}
                  onLongPress={() => remove.mutate(item.id)}
                  style={[styles.itemRow, i > 0 && styles.itemBorder]}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxDone]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, item.checked && styles.itemDone]}>{item.name}</Text>
                    {item.qty_g && <SystemText dim style={{ fontSize: 11 }}>{item.qty_g}g</SystemText>}
                  </View>
                </Pressable>
              ))}
            </SystemPanel>
          </Animated.View>
        ))}

        {/* Ya comprado */}
        {checked.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <SystemText style={styles.catLabel}>Ya comprado ({checked.length})</SystemText>
              <Pressable onPress={() => clearChecked.mutate()}>
                <SystemText dim style={{ fontSize: 12 }}>Limpiar ×</SystemText>
              </Pressable>
            </View>
            <SystemPanel style={{ gap: 0, padding: 0, overflow: 'hidden', opacity: 0.5 }}>
              {checked.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggle.mutate({ id: item.id, checked: false })}
                  style={[styles.itemRow, i > 0 && styles.itemBorder]}
                >
                  <View style={[styles.checkbox, styles.checkboxDone]} />
                  <Text style={[styles.itemName, styles.itemDone]}>{item.name}</Text>
                </Pressable>
              ))}
            </SystemPanel>
          </Animated.View>
        )}

        {items.length === 0 && (
          <SystemPanel style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🛒</Text>
            <SystemText dim style={{ textAlign: 'center' }}>
              Tu lista está vacía.{'\n'}Agrega alimentos o importa desde tus comidas de hoy.
            </SystemText>
          </SystemPanel>
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
  catLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: 6 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.panelBorder, backgroundColor: colors.bgElevated,
  },
  catPillActive: { backgroundColor: gradients.brand[1], borderColor: gradients.brand[1] },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.panelBorder },
  checkbox: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.panelBorder,
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  itemName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  itemDone: { textDecorationLine: 'line-through', color: colors.textFaint },
});
