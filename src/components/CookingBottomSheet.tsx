import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SystemText, GradientText } from './system';
import { colors, gradients, spacing, radius } from '../theme/system';

interface CookingBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  steps: string[];
  prepTime: number;
  title: string;
}

export function CookingBottomSheet({ isOpen, onClose, steps, prepTime, title }: CookingBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  useEffect(() => {
    if (isOpen) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [isOpen]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
    ),
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="time-outline" size={18} color={colors.glow} />
            <GradientText style={styles.headerTitle}>Preparación</GradientText>
          </View>
          <View style={styles.timeBadge}>
            <SystemText style={styles.timeBadgeText}>{prepTime} min</SystemText>
          </View>
        </View>
        <SystemText dim style={styles.recipeSubtitle}>{title}</SystemText>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <LinearGradient
                colors={gradients.brand}
                style={styles.stepCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <SystemText style={styles.stepNum}>{i + 1}</SystemText>
              </LinearGradient>
              <View style={styles.stepContent}>
                <SystemText style={styles.stepText}>{step}</SystemText>
                {i < steps.length - 1 && <View style={styles.stepConnector} />}
              </View>
            </View>
          ))}
        </View>

        {/* Close */}
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <SystemText style={styles.closeBtnText}>Listo</SystemText>
        </Pressable>

        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElevated },
  handle: { backgroundColor: colors.panelBorder, width: 40 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  timeBadge: { backgroundColor: colors.primary + '22', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '44' },
  timeBadgeText: { fontSize: 13, fontWeight: '700', color: colors.glow },
  recipeSubtitle: { fontSize: 13, marginBottom: spacing.lg },
  stepsContainer: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNum: { fontSize: 13, fontWeight: '900', color: '#fff' },
  stepContent: { flex: 1, paddingTop: 6 },
  stepText: { fontSize: 14, lineHeight: 22 },
  stepConnector: { width: 1, height: 20, backgroundColor: colors.panelBorder, marginTop: spacing.sm, marginLeft: -spacing.md - 15 },
  closeBtn: { backgroundColor: colors.panel, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', marginTop: spacing.lg, borderWidth: 1, borderColor: colors.panelBorder },
  closeBtnText: { fontWeight: '700', fontSize: 15 },
});
