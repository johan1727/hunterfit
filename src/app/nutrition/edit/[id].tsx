import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useMealLogs } from '../../../hooks/useData';
import { supabase } from '../../../lib/supabase';
import { localDateString } from '../../../lib/dates';
import { colors, spacing } from '../../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton, StatRow } from '../../../components/system';

export default function EditMealScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { id: idParam } = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const today = localDateString();
  const { data: meals = [] } = useMealLogs(userId, today);
  const meal = meals.find((m) => m.id === id);
  const [quantity, setQuantity] = useState(meal?.quantity_g.toString() || '100');
  const [saving, setSaving] = useState(false);

  if (!meal) {
    return (
      <SafeAreaView style={styles.container}>
        <SystemPanel>
          <SystemText>Comida no encontrada</SystemText>
        </SystemPanel>
      </SafeAreaView>
    );
  }

  async function handleDelete() {
    Alert.alert('Eliminar Comida', '¿Estás seguro?', [
      { text: 'Cancelar' },
      {
        text: 'Eliminar',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('meal_logs')
              .delete()
              .eq('id', id);
            if (error) throw error;
            router.replace('/(tabs)/nutrition');
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  async function handleUpdate() {
    if (!meal) return;
    try {
      setSaving(true);
      const qty = parseFloat(quantity) || 100;
      const multiplier = qty / meal.quantity_g;
      const { error } = await supabase
        .from('meal_logs')
        .update({
          quantity_g: Math.round(qty),
          kcal: Math.round(meal.kcal * multiplier),
          protein_g: Math.round(meal.protein_g * multiplier * 10) / 10,
          carbs_g: Math.round(meal.carbs_g * multiplier * 10) / 10,
          fat_g: Math.round(meal.fat_g * multiplier * 10) / 10,
        })
        .eq('id', id);
      if (error) throw error;
      router.replace('/(tabs)/nutrition');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <SystemTitle>{meal.custom_name}</SystemTitle>
          <SystemText style={{ marginTop: spacing.sm }}>
            Tipo: {meal.meal_type}
          </SystemText>
        </SystemPanel>

        <SystemPanel>
          <SystemText style={{ marginBottom: spacing.md }}>Cantidad (gramos)</SystemText>
          <TextInput
            style={styles.input}
            placeholder="100"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />

          <View style={styles.summary}>
            <SystemText style={{ marginBottom: spacing.md }}>Valores para {quantity}g:</SystemText>
            {(() => {
              const qty = parseFloat(quantity) || meal.quantity_g;
              const multiplier = qty / meal.quantity_g;
              return (
                <>
                  <StatRow label="Calorías" value={`${(meal.kcal * multiplier).toFixed(0)} kcal`} />
                  <StatRow label="Proteína" value={`${(meal.protein_g * multiplier).toFixed(1)}g`} />
                  <StatRow label="Carbohidratos" value={`${(meal.carbs_g * multiplier).toFixed(1)}g`} />
                  <StatRow label="Grasas" value={`${(meal.fat_g * multiplier).toFixed(1)}g`} />
                </>
              );
            })()}
          </View>

          <SystemButton
            title="GUARDAR CAMBIOS"
            loading={saving}
            onPress={handleUpdate}
          />

          <SystemButton
            title="ELIMINAR COMIDA"
            variant="danger"
            onPress={handleDelete}
            disabled={saving}
            style={{ marginTop: spacing.md }}
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
  input: {
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
  summary: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
});
