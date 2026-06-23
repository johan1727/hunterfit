import { View, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../theme/system';
import { SystemText, SystemButton } from './system';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  cta?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, cta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <SystemText style={styles.icon}>{icon}</SystemText>
      <SystemText style={styles.title}>{title}</SystemText>
      <SystemText dim style={styles.subtitle}>{subtitle}</SystemText>
      {cta && (
        <SystemButton
          title={cta.label}
          variant="gradient"
          onPress={cta.onPress}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  icon: { fontSize: 56 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  button: { marginTop: spacing.md, alignSelf: 'center', minWidth: 200 },
});
