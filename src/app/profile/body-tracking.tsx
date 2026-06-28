import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, SafeAreaView, Pressable, Alert,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useHunterData } from '../../hooks/useHunterData';
import { useBodyMeasurements, useAddBodyMeasurement, useWeightHistory } from '../../hooks/useData';
import { useDemoStore } from '../../lib/demoStore';
import {
  AuroraBackground, GradientText, SystemPanel, SystemText, SystemButton, SystemInput,
} from '../../components/system';
import { colors, gradients, radius, spacing } from '../../theme/system';

export default function BodyTrackingScreen() {
  const router = useRouter();
  const { profile, isDemo, userId } = useHunterData();
  const exitDemo = useDemoStore((s) => s.exitDemo);

  const measurements = useBodyMeasurements(isDemo ? null : userId);
  const weightHistory = useWeightHistory(isDemo ? null : userId);
  const addMeasurement = useAddBodyMeasurement(isDemo ? null : userId);

  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!weight && !waist && !hips && !chest && !arm && !bodyFat) {
      Alert.alert('Requerido', 'Ingresa al menos una medida');
      return;
    }

    if (isDemo) {
      Alert.alert('Modo exploración', 'Crea una cuenta para guardar medidas corporales');
      exitDemo();
      return;
    }

    const now = new Date().toISOString().split('T')[0];
    const measurement = {
      taken_at: now,
      weight_kg: weight ? parseFloat(weight.replace(',', '.')) : null,
      waist_cm: waist ? parseFloat(waist.replace(',', '.')) : null,
      hips_cm: hips ? parseFloat(hips.replace(',', '.')) : null,
      chest_cm: chest ? parseFloat(chest.replace(',', '.')) : null,
      arm_cm: arm ? parseFloat(arm.replace(',', '.')) : null,
      body_fat_pct: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null,
      notes: null,
    };

    setSaving(true);
    try {
      await addMeasurement.mutateAsync(measurement);
      setWeight('');
      setWaist('');
      setHips('');
      setChest('');
      setArm('');
      setBodyFat('');
      Alert.alert('Éxito', 'Medida guardada');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la medida');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <AuroraBackground />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <GradientText style={{ fontSize: 22 }}>Seguimiento Corporal</GradientText>
          <SystemText dim style={{ marginTop: 8 }}>Cargando…</SystemText>
        </View>
      </SafeAreaView>
    );
  }

  const data = measurements.data ?? [];
  const chartData = weightHistory.data ?? [];

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.textDim} />
          </Pressable>
          <GradientText style={{ fontSize: 28, fontWeight: '900' }}>Seguimiento</GradientText>
        </View>

        {/* Weight Chart */}
        {chartData.length > 1 && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <SystemPanel style={{ gap: spacing.md }}>
              <SystemText style={styles.sectionLabel}>Evolución de peso</SystemText>
              <WeightChart data={chartData} />
            </SystemPanel>
          </Animated.View>
        )}

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SystemPanel style={{ gap: spacing.md }}>
            <SystemText style={styles.sectionLabel}>Registrar medidas</SystemText>

            {/* Row 1: Weight, Waist */}
            <View style={styles.row}>
              <SystemInput
                placeholder="Peso (kg)"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
              <SystemInput
                placeholder="Cintura (cm)"
                keyboardType="decimal-pad"
                value={waist}
                onChangeText={setWaist}
              />
            </View>

            {/* Row 2: Hips, Chest */}
            <View style={styles.row}>
              <SystemInput
                placeholder="Cadera (cm)"
                keyboardType="decimal-pad"
                value={hips}
                onChangeText={setHips}
              />
              <SystemInput
                placeholder="Pecho (cm)"
                keyboardType="decimal-pad"
                value={chest}
                onChangeText={setChest}
              />
            </View>

            {/* Row 3: Arm, Body Fat */}
            <View style={styles.row}>
              <SystemInput
                placeholder="Brazo (cm)"
                keyboardType="decimal-pad"
                value={arm}
                onChangeText={setArm}
              />
              <SystemInput
                placeholder="Grasa corporal (%)"
                keyboardType="decimal-pad"
                value={bodyFat}
                onChangeText={setBodyFat}
              />
            </View>

            {/* Save Button */}
            <SystemButton
              title={saving ? 'Guardando…' : 'Guardar medida'}
              variant="gradient"
              disabled={saving}
              onPress={handleSave}
            />
          </SystemPanel>
        </Animated.View>

        {/* History */}
        {data.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <SystemPanel style={{ gap: spacing.md }}>
              <SystemText style={styles.sectionLabel}>Historial reciente</SystemText>
              {data.slice(0, 10).map((m) => (
                <MeasurementRow key={m.id} measurement={m} />
              ))}
            </SystemPanel>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WeightChart({ data }: { data: Array<{ date: string; weight_kg: number }> }) {
  if (data.length < 2) return null;

  const W = 280;
  const H = 100;
  const values = data.map((d) => d.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Points for chart
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.weight_kg - min) / range) * H;
    return { x, y, v: d.weight_kg };
  });

  // Dates for axis labels
  const firstDate = data[0].date;
  const lastDate = data[data.length - 1].date;
  const currentWeight = data[data.length - 1].weight_kg;

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Chart Container with absolute positioned lines */}
      <View style={{ height: H + 30, width: W, position: 'relative', paddingBottom: 20 }}>
        {/* Grid line */}
        <View
          style={{
            position: 'absolute',
            top: H / 2,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.panelBorder,
          }}
        />

        {/* Connecting lines between points */}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const dx = next.x - p.x;
          const dy = next.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View
              key={`line-${i}`}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: len,
                height: 2,
                backgroundColor: colors.primary,
                transformOrigin: 'left center',
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* Point dots */}
        {points.map((p, i) => (
          <View
            key={`dot-${i}`}
            style={{
              position: 'absolute',
              left: p.x - 3,
              top: p.y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary,
            }}
          />
        ))}

        {/* Axis labels */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 2,
          }}
        >
          <SystemText dim style={{ fontSize: 11 }}>{firstDate}</SystemText>
          <SystemText dim style={{ fontSize: 11 }}>{lastDate}</SystemText>
        </View>
      </View>

      {/* Current weight display */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SystemText dim style={{ fontSize: 13 }}>Peso actual</SystemText>
        <GradientText style={{ fontSize: 20, fontWeight: '900' }}>{currentWeight.toFixed(1)} kg</GradientText>
      </View>
    </View>
  );
}

function MeasurementRow({ measurement }: { measurement: any }) {
  const parts: string[] = [];

  if (measurement.weight_kg) parts.push(`${measurement.weight_kg.toFixed(1)}kg`);
  if (measurement.waist_cm) parts.push(`Cin:${measurement.waist_cm.toFixed(0)}`);
  if (measurement.hips_cm) parts.push(`Cad:${measurement.hips_cm.toFixed(0)}`);
  if (measurement.chest_cm) parts.push(`Pec:${measurement.chest_cm.toFixed(0)}`);
  if (measurement.arm_cm) parts.push(`Bra:${measurement.arm_cm.toFixed(0)}`);
  if (measurement.body_fat_pct) parts.push(`${measurement.body_fat_pct.toFixed(1)}%`);

  const summary = parts.join(', ');
  const date = measurement.taken_at;

  return (
    <View style={styles.historyRow}>
      <View>
        <SystemText style={{ fontSize: 14, fontWeight: '600' }}>{date}</SystemText>
        <SystemText dim style={{ fontSize: 12, marginTop: 2 }}>{summary}</SystemText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.panelBorder,
    paddingVertical: spacing.md,
  },
});
