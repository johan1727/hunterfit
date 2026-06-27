import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Text } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { SystemText, GradientText, SystemButton } from './system';
import { colors, gradients, spacing, radius } from '../theme/system';

interface FoodDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  food: {
    name_es: string;
    icon: string; // URL de imagen o emoji
    category: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    serving_g: number;
    brand?: string;
  };
}

export function FoodDetailBottomSheet({
  isOpen,
  onClose,
  food,
}: FoodDetailBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '90%'], []);

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

  // Renderizar el icono (imagen URL o emoji)
  const renderFoodIcon = () => {
    const isEmoji = food.icon.length <= 2 || !food.icon.includes('/');
    if (isEmoji) {
      return (
        <Text style={styles.emojiIcon}>{food.icon}</Text>
      );
    }
    return (
      <Image
        source={{ uri: food.icon }}
        style={styles.foodImage}
      />
    );
  };

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
        {/* Handle bar decorativo (ya está en BottomSheet, pero lo mencionamos aquí) */}

        {/* Imagen/Icono del alimento con borde gradiente */}
        <View style={styles.imageContainer}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imageBorderGradient}
          >
            <View style={styles.imageInner}>
              {renderFoodIcon()}
            </View>
          </LinearGradient>
        </View>

        {/* Nombre del alimento + marca */}
        <View style={styles.titleSection}>
          <GradientText style={styles.foodName}>{food.name_es}</GradientText>
          {food.brand && (
            <SystemText dim style={styles.brandText}>{food.brand}</SystemText>
          )}
        </View>

        {/* Categoría como pill */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryEmoji}>🏷️</Text>
          <SystemText style={styles.categoryText}>{food.category}</SystemText>
        </View>

        {/* Tabla de macros — 4 columnas */}
        <View style={styles.macrosTable}>
          {/* Encabezado */}
          <View style={styles.macrosHeaderRow}>
            <View style={styles.macroColumn}>
              <SystemText dim style={styles.macroLabel}>Kcal</SystemText>
            </View>
            <View style={styles.macroColumn}>
              <SystemText dim style={styles.macroLabel}>Proteína</SystemText>
            </View>
            <View style={styles.macroColumn}>
              <SystemText dim style={styles.macroLabel}>Carbs</SystemText>
            </View>
            <View style={styles.macroColumn}>
              <SystemText dim style={styles.macroLabel}>Grasas</SystemText>
            </View>
          </View>

          {/* Valores */}
          <View style={styles.macrosValueRow}>
            <View style={styles.macroColumn}>
              <Text style={styles.macroValue}>{food.kcal}</Text>
            </View>
            <View style={styles.macroColumn}>
              <Text style={styles.macroValue}>{food.protein_g}g</Text>
            </View>
            <View style={styles.macroColumn}>
              <Text style={styles.macroValue}>{food.carbs_g}g</Text>
            </View>
            <View style={styles.macroColumn}>
              <Text style={styles.macroValue}>{food.fat_g}g</Text>
            </View>
          </View>

          {/* Fila adicional: fibra */}
          <View style={[styles.macrosHeaderRow, { marginTop: spacing.md }]}>
            <View style={styles.macroColumn}>
              <SystemText dim style={styles.macroLabel}>Fibra</SystemText>
            </View>
          </View>
          <View style={styles.macrosValueRow}>
            <View style={styles.macroColumn}>
              <Text style={styles.macroValue}>{food.fiber_g}g</Text>
            </View>
          </View>
        </View>

        {/* Tamaño de porción */}
        <View style={styles.servingSection}>
          <SystemText dim style={styles.servingLabel}>Tamaño de porción</SystemText>
          <Text style={styles.servingValue}>{food.serving_g}g</Text>
        </View>

        {/* Botón cerrar */}
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <SystemText style={styles.closeBtnText}>Entendido</SystemText>
        </Pressable>

        {/* Espaciador inferior */}
        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElevated },
  handle: { backgroundColor: colors.panelBorder, width: 40 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  // Imagen con borde gradiente
  imageContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  imageBorderGradient: {
    borderRadius: radius.lg,
    padding: 2,
  },
  imageInner: {
    width: 200,
    height: 200,
    borderRadius: radius.lg - 2,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emojiIcon: {
    fontSize: 80,
  },

  // Título y marca
  titleSection: {
    marginBottom: spacing.md,
  },
  foodName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  brandText: {
    fontSize: 13,
  },

  // Categoría pill
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Tabla de macros
  macrosTable: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  macrosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  macrosValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.panelBorder,
  },
  macroColumn: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.glow,
  },

  // Tamaño de porción
  servingSection: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  servingLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  servingValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  // Botón cerrar
  closeBtn: {
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  closeBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
