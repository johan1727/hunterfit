import React from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Text } from 'react-native';
import { colors, spacing } from '../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton } from './system';

interface PremiumPaywallProps {
  feature: string;
  onUnlock?: () => void;
}

export default function PremiumPaywall({ feature, onUnlock }: PremiumPaywallProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <Text style={styles.crown}>👑</Text>
          <SystemTitle>FEATURE PREMIUM</SystemTitle>
        </SystemPanel>

        <SystemPanel>
          <SystemText style={{ fontSize: 16, marginBottom: spacing.lg }}>
            {feature} es una característica exclusiva para miembros premium.
          </SystemText>

          <View style={styles.features}>
            <FeatureRow icon="📸" text="Analizar fotos de comida con IA" />
            <FeatureRow icon="🧬" text="Análisis de composición corporal" />
            <FeatureRow icon="🎯" text="Rutinas personalizadas avanzadas" />
            <FeatureRow icon="⚡" text="Sin límite de análisis" />
          </View>

          <View style={styles.pricing}>
            <Text style={styles.price}>$3.99</Text>
            <Text style={styles.pricePeriod}>por mes</Text>
          </View>

          <SystemButton
            title="DESBLOQUEAR PREMIUM"
            onPress={onUnlock || (() => {})}
            style={{ marginBottom: spacing.md }}
          />

          <SystemButton
            title="CONTINUAR SIN PREMIUM"
            variant="ghost"
            onPress={() => {}}
          />
        </SystemPanel>

        <SystemPanel>
          <SystemText style={{ fontSize: 12, color: colors.textDim, textAlign: 'center' }}>
            Por ahora, esta es una demostración. La integración real de pagos requiere RevenueCat o App Store.
          </SystemText>
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg, alignItems: 'center' },
  crown: { fontSize: 40, marginBottom: spacing.md },
  features: { marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  featureIcon: { fontSize: 20, marginRight: spacing.md, width: 30 },
  featureText: { flex: 1, color: colors.text, fontSize: 14 },
  pricing: { alignItems: 'center', paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.panelBorder, marginBottom: spacing.lg },
  price: { color: colors.glow, fontSize: 32, fontWeight: '800' },
  pricePeriod: { color: colors.textDim, fontSize: 13, marginTop: 4 },
});
