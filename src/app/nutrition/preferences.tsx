import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SystemText, AuroraBackground } from '../../components/system';
import { colors, spacing, radius } from '../../theme/system';
import { usePreferencesStore, DIET_CATEGORIES } from '../../lib/preferencesStore';

export default function PreferencesScreen() {
  const { selectedCategories, toggleCategory, completeOnboarding, hasCompletedOnboarding } = usePreferencesStore();
  const canContinue = selectedCategories.length > 0;

  const handleContinue = () => {
    completeOnboarding();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuroraBackground />

      {/* Header — solo mostrar botón volver si ya completó onboarding antes */}
      {hasCompletedOnboarding && (
        <Pressable
          onPress={() => router.back()}
          style={{ margin: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: hasCompletedOnboarding ? spacing.sm : spacing.xl, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <SystemText style={{ fontSize: 30, fontWeight: '900', color: colors.text, marginBottom: spacing.sm }}>
          ¿Qué incluyes{'\n'}en tu dieta?
        </SystemText>
        <SystemText dim style={{ fontSize: 14, lineHeight: 22, marginBottom: spacing.xl }}>
          El Hunter AI usará esto para crear recetas personalizadas con los alimentos que sí consumes.
        </SystemText>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {DIET_CATEGORIES.map(cat => {
            const isSelected = selectedCategories.includes(cat.key);
            return (
              <Pressable
                key={cat.key}
                onPress={() => toggleCategory(cat.key)}
                style={{
                  width: '30%',
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? '#5B7CFF' : '#ffffff18',
                  backgroundColor: isSelected ? '#5B7CFF18' : '#ffffff08',
                  gap: 8,
                }}
              >
                <SystemText style={{ fontSize: 32 }}>{cat.emoji}</SystemText>
                <SystemText style={{ fontSize: 11, textAlign: 'center', color: isSelected ? '#5B7CFF' : '#ffffff88', fontWeight: isSelected ? '700' : '400' }}>
                  {cat.label}
                </SystemText>
              </Pressable>
            );
          })}
        </View>

        {selectedCategories.length > 0 && (
          <SystemText dim style={{ fontSize: 12, textAlign: 'center', marginTop: spacing.lg }}>
            {selectedCategories.length} grupo{selectedCategories.length !== 1 ? 's' : ''} seleccionado{selectedCategories.length !== 1 ? 's' : ''}
          </SystemText>
        )}
      </ScrollView>

      {/* Botón flotante */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: 40, backgroundColor: colors.bg + 'E0' }}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={{ opacity: canContinue ? 1 : 0.4, borderRadius: radius.pill, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#5B7CFF', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <SystemText style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {hasCompletedOnboarding ? 'Guardar preferencias' : 'Continuar →'}
            </SystemText>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
