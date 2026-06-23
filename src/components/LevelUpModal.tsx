import { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Text, Pressable } from 'react-native';
import Animated, {
  FadeIn, FadeOut, useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, spacing } from '../theme/system';
import { GradientText, SystemText } from './system';

type Props = {
  visible: boolean;
  level: number;
  onClose: () => void;
};

export function LevelUpModal({ visible, level, onClose }: Props) {
  const scale = useSharedValue(0.5);
  const rotate = useSharedValue(-8);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 200 }),
        withDelay(100, withSpring(1, { damping: 12, stiffness: 200 })),
      );
      rotate.value = withSequence(
        withSpring(8, { damping: 6 }),
        withSpring(-4, { damping: 8 }),
        withSpring(0, { damping: 10 }),
      );
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.sheet}>
          <LinearGradient
            colors={['#07080B', '#0D0F16']}
            style={styles.card}
          >
            {/* Glow effect */}
            <View style={styles.glowWrap}>
              <LinearGradient
                colors={gradients.brand as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.glowRing}
              >
                <View style={styles.glowInner}>
                  <Animated.View style={animStyle}>
                    <Text style={styles.levelEmoji}>⚔️</Text>
                  </Animated.View>
                </View>
              </LinearGradient>
            </View>

            <SystemText style={styles.subTitle}>¡SISTEMA: RANGO AUMENTADO!</SystemText>
            <GradientText style={styles.levelText}>Nivel {level}</GradientText>
            <SystemText dim style={{ fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              Has subido de nivel. Tus estadísticas han aumentado y nuevos desafíos te esperan.
            </SystemText>

            <Pressable onPress={onClose} style={styles.btn}>
              <LinearGradient
                colors={gradients.brand as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btnGrad}
              >
                <Text style={styles.btnText}>Continuar →</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  sheet: { width: '85%', maxWidth: 360 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: gradients.brand[1] + '60',
  },

  glowWrap: {
    shadowColor: gradients.brand[0],
    shadowOpacity: 0.9, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
    marginBottom: spacing.sm,
  },
  glowRing: {
    width: 100, height: 100, borderRadius: 50,
    padding: 3, alignItems: 'center', justifyContent: 'center',
  },
  glowInner: {
    flex: 1, borderRadius: 47, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  levelEmoji: { fontSize: 40 },

  subTitle: {
    fontSize: 11, letterSpacing: 2, color: gradients.brand[1],
    fontWeight: '800', textTransform: 'uppercase',
  },
  levelText: { fontSize: 52, lineHeight: 56, fontWeight: '900' },

  btn: { marginTop: spacing.sm, width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  btnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: radius.pill },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
