import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Pressable, Text, Alert, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useHunterData } from '../../hooks/useHunterData';
import { useDemoStore } from '../../lib/demoStore';
import {
  useActiveFasting, useStartFasting, useStopFasting, useFastingStreak,
} from '../../hooks/useData';
import { colors, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, SystemPanel, SystemText, SystemButton,
} from '../../components/system';
import { HudPanel } from '../../components/HudPanel';

const SCHEDULES = [
  { hours: 16, label: 'Popular', desc: 'Ayuno 16h, comer en 8h' },
  { hours: 18, label: 'Intenso', desc: 'Ayuno 18h, comer en 6h' },
  { hours: 20, label: 'Avanzado', desc: 'Ayuno 20h, comer en 4h' },
] as const;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function CircleTimer({
  elapsed,
  targetMs,
  size = 200,
}: {
  elapsed: number;
  targetMs: number;
  size?: number;
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, elapsed / targetMs);
  const strokeDashoffset = circumference * (1 - progress);

  const remaining = Math.max(0, targetMs - elapsed);
  const windowOpen = elapsed >= targetMs;
  const timeStr = formatTime(remaining);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.panelBorder}
          strokeWidth={4}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={windowOpen ? colors.success : colors.glow}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center text */}
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={styles.timerText}>{timeStr}</Text>
        <Text style={[styles.timerLabel, { color: windowOpen ? colors.success : colors.textDim }]}>
          {windowOpen ? '¡Ventana abierta!' : 'restante'}
        </Text>
      </View>
    </View>
  );
}

export default function FastingScreen() {
  const router = useRouter();
  const { userId } = useHunterData();
  const isDemo = useDemoStore((s) => s.isDemo);
  const { data: activeFast } = useActiveFasting(userId);
  const { data: streak = 0 } = useFastingStreak(userId);
  const startFasting = useStartFasting(userId);
  const stopFasting = useStopFasting(userId);

  const [selectedHours, setSelectedHours] = useState<number>(16);
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Timer update every 60 seconds
  useEffect(() => {
    if (!activeFast) return;

    const update = () => {
      const now = new Date().getTime();
      const started = new Date(activeFast.started_at).getTime();
      setElapsed(now - started);
    };

    update(); // Set immediately
    const interval = setInterval(update, 1000); // Update every second for smoother display
    return () => clearInterval(interval);
  }, [activeFast]);

  // Schedule notification when starting fasting
  useEffect(() => {
    if (!activeFast) return;

    const scheduleNotification = async () => {
      try {
        const endTime = new Date(activeFast.started_at).getTime() + activeFast.target_hours * 3600 * 1000;
        const delay = Math.max(0, endTime - new Date().getTime());

        if (delay > 0) {
          await Notifications.scheduleNotificationAsync({
            identifier: `fasting_${activeFast.id}`,
            content: {
              title: '🍽️ ¡Tu ventana de comida está abierta!',
              body: 'Has completado tu ayuno. Puedes comer ahora.',
              sound: true,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(delay / 1000) },
          });
        }
      } catch (e) {
        console.warn('Failed to schedule notification:', e);
      }
    };

    scheduleNotification();
  }, [activeFast]);

  const handleStartFasting = async (hours: number) => {
    if (isDemo) {
      Alert.alert('Modo demo', 'No disponible en modo exploración');
      return;
    }
    try {
      await startFasting.mutateAsync(hours);
      // Request notification permission
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.warn('Notification permission denied:', e);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo iniciar el ayuno');
    }
  };

  const handleStopFasting = async (completed: boolean) => {
    if (!activeFast) return;
    try {
      await stopFasting.mutateAsync({ id: activeFast.id, completed });
      setShowConfirm(false);
      // Cancel scheduled notification
      try {
        await Notifications.cancelScheduledNotificationAsync(`fasting_${activeFast.id}`);
      } catch (e) {
        console.warn('Failed to cancel notification:', e);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo detener el ayuno');
    }
  };

  const targetMs = activeFast ? activeFast.target_hours * 3600 * 1000 : 0;
  const windowOpen = activeFast ? elapsed >= targetMs : false;

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color={colors.warning} />
              <Text style={styles.streakText}>Racha: {streak} días</Text>
            </View>
          </View>
          <GradientText style={styles.title}>Control de Ayuno</GradientText>
        </Animated.View>

        {!activeFast ? (
          <>
            {/* Schedule Picker */}
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <SystemPanel style={{ gap: spacing.sm }}>
                <SystemText style={{ fontSize: 13, fontWeight: '700', color: colors.textFaint, marginBottom: spacing.md }}>
                  SELECCIONA TU HORARIO
                </SystemText>
                {SCHEDULES.map((schedule) => (
                  <Pressable
                    key={schedule.hours}
                    onPress={() => setSelectedHours(schedule.hours)}
                    style={({ pressed }) => [
                      styles.scheduleItem,
                      selectedHours === schedule.hours && styles.scheduleItemActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.scheduleContent}>
                      <Text style={styles.scheduleLabel}>{schedule.label}</Text>
                      <SystemText dim style={{ fontSize: 12 }}>
                        {schedule.desc}
                      </SystemText>
                    </View>
                    <View
                      style={[
                        styles.scheduleCheck,
                        selectedHours === schedule.hours && styles.scheduleCheckActive,
                      ]}
                    >
                      {selectedHours === schedule.hours && (
                        <Ionicons name="checkmark" size={16} color={colors.bg} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </SystemPanel>
            </Animated.View>

            {/* Info Panel */}
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <HudPanel>
                <View style={{ gap: spacing.md }}>
                  <View style={styles.infoRow}>
                    <SystemText dim>Horas de ayuno</SystemText>
                    <Text style={styles.infoValue}>{selectedHours}h</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <SystemText dim>Ventana de comida</SystemText>
                    <Text style={styles.infoValue}>{24 - selectedHours}h</Text>
                  </View>
                </View>
              </HudPanel>
            </Animated.View>

            {/* Start Button */}
            <Animated.View entering={FadeInDown.delay(240).springify()}>
              <SystemButton
                title={`Iniciar Ayuno (${selectedHours}h)`}
                variant="gradient"
                onPress={() => handleStartFasting(selectedHours)}
                loading={startFasting.isPending}
                style={{ marginTop: spacing.md }}
              />
            </Animated.View>
          </>
        ) : (
          <>
            {/* Active Fasting Timer */}
            <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.timerContainer}>
              <HudPanel style={{ alignItems: 'center' }}>
                <CircleTimer elapsed={elapsed} targetMs={targetMs} size={220} />
                <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
                  <SystemText dim style={{ fontSize: 12 }}>
                    Objetivo: {activeFast.target_hours}h de ayuno
                  </SystemText>
                </View>
              </HudPanel>
            </Animated.View>

            {/* Control Buttons */}
            <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: spacing.sm }}>
              <SystemButton
                title={windowOpen ? 'Completar Ayuno ✓' : 'Romper Ayuno'}
                variant={windowOpen ? 'gradient' : 'primary'}
                onPress={() => setShowConfirm(true)}
              />
              <SystemButton
                title="Cancelar"
                variant="ghost"
                onPress={() => handleStopFasting(false)}
              />
            </Animated.View>
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {windowOpen ? '¿Completar ayuno?' : '¿Romper el ayuno?'}
            </Text>
            <SystemText
              dim
              style={{ textAlign: 'center', marginVertical: spacing.md }}
            >
              {windowOpen
                ? 'Marcarás este ayuno como completado.'
                : 'Cancelarás el ayuno sin marcar como completado.'}
            </SystemText>
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <SystemButton
                title={windowOpen ? 'Completar' : 'Romper'}
                variant={windowOpen ? 'gradient' : 'danger'}
                onPress={() => handleStopFasting(windowOpen)}
                loading={stopFasting.isPending}
              />
              <SystemButton
                title="Volver"
                variant="ghost"
                onPress={() => setShowConfirm(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg, gap: spacing.sm, paddingBottom: 100 },

  header: { gap: spacing.sm, marginBottom: spacing.md },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  streakText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  title: { fontSize: 42, lineHeight: 44 },

  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    gap: spacing.md,
  },
  scheduleItemActive: {
    backgroundColor: colors.bg,
    borderColor: colors.glow,
    borderWidth: 2,
  },
  scheduleContent: { flex: 1 },
  scheduleLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  scheduleCheck: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  scheduleCheckActive: {
    backgroundColor: colors.glow,
    borderColor: colors.glow,
  },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoValue: { color: colors.glow, fontSize: 18, fontWeight: '800' },

  timerContainer: { alignItems: 'center', marginVertical: spacing.lg },
  timerText: { color: colors.text, fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 12, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
