import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native';
import { colors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton } from '../../components/system';

export default function AddMealScreen() {
  const { type } = useLocalSearchParams();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SystemPanel style={{ padding: spacing.md, marginTop: spacing.lg }}>
        <SystemTitle>Agregar Comida</SystemTitle>
        <SystemText style={{ marginTop: spacing.md }}>Tipo: {type}</SystemText>
        <SystemText style={{ marginTop: spacing.md, color: colors.textDim }}>
          Usa el botón "Buscar y Agregar Alimento" en la pantalla anterior.
        </SystemText>
        <SystemButton title="Volver" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </SystemPanel>
    </SafeAreaView>
  );
}
