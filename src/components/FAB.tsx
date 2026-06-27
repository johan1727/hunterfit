import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { gradients, radius } from '../theme/system';

interface Props {
  onPress: () => void;
  label?: string;
}

export function FAB({ onPress, label = '+' }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      onPress={onPress}
    >
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        <Text style={styles.icon}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    zIndex: 99,
    width: 56, height: 56,
    borderRadius: radius.pill,
    shadowColor: '#5B7CFF',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  btn: {
    width: 56, height: 56,
    borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32, marginTop: -2 },
});
