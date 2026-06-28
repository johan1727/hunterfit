import React from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { colors, gradients, panel, radius, rankColors, spacing } from '../theme/system';
import type { HunterRank } from '../types/db';

/** Stops de gradiente: LinearGradient exige al menos dos colores (tupla readonly). */
type GradStops = readonly [string, string, ...string[]];

/** Panel — superficie elevada casi negra con borde hairline (estilo Savee) */
export function SystemPanel({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.panel, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * System Window Panel — borde de gradiente vivo (1.5 px LinearGradient wrap).
 * El differentiator Aurora: solo la tarjeta principal lo usa; el ojo va ahí primero.
 */
export function SystemWindowPanel({ style, children, borderWidth = 1.5 }: ViewProps & { borderWidth?: number }) {
  return (
    <LinearGradient
      colors={gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.lg + borderWidth, padding: borderWidth }]}
    >
      <View style={[styles.windowInner, style]}>
        {children}
      </View>
    </LinearGradient>
  );
}

export function SystemTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function SystemLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function SystemText({ children, dim, style, ...rest }: { children: React.ReactNode; dim?: boolean; style?: StyleProp<TextStyle> } & Omit<TextProps, 'style' | 'children'>) {
  return <Text style={[styles.text, dim && { color: colors.textDim }, style]} {...rest}>{children}</Text>;
}

/** Titular grande con relleno de gradiente (azul→violeta→rosa, estilo Kokonut) */
export function GradientText({
  children,
  style,
  colors: gradColors = gradients.brand,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  colors?: GradStops;
}) {
  // Web: react-native-web soporta gradiente CSS recortado al texto (sin MaskedView).
  if (Platform.OS === 'web') {
    const webStyle = {
      backgroundImage: `linear-gradient(135deg, ${gradColors.join(', ')})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    } as unknown as TextStyle;
    return <Text style={[styles.display, style, webStyle]}>{children}</Text>;
  }

  return (
    <MaskedView
      maskElement={<Text style={[styles.display, style]}>{children}</Text>}
    >
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Texto transparente: define el tamaño del gradiente */}
        <Text style={[styles.display, style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

/** Chip pill con punto (estilo etiqueta "● Kokonut UI") */
export function Pill({ children, dotColor = colors.danger, style }: { children: React.ReactNode; dotColor?: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.pillText, style]}>{children}</Text>
    </View>
  );
}

/** Fondo "aurora": cápsulas de luz suaves y rotadas flotando en negro (estilo Kokonut) */
export function AuroraBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Capsule colors={gradients.capsuleCool} style={{ top: -40, left: -60, transform: [{ rotate: '-28deg' }] }} />
      <Capsule colors={gradients.capsuleViolet} style={{ top: '34%', right: -90, transform: [{ rotate: '18deg' }] }} />
      <Capsule colors={gradients.capsuleWarm} style={{ bottom: 40, left: -50, transform: [{ rotate: '-12deg' }] }} />
    </View>
  );
}

function Capsule({ colors: c, style }: { colors: GradStops; style?: StyleProp<ViewStyleLike> }) {
  return (
    <LinearGradient
      colors={c}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.capsule, style as object]}
    />
  );
}
type ViewStyleLike = object;

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'gradient' | 'ghost' | 'danger';
  loading?: boolean;
}

export function SystemButton({ title, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const isGradient = variant === 'gradient';
  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? '#000' : colors.white} />
  ) : (
    <Text
      style={[
        styles.buttonText,
        variant === 'primary' && { color: '#0A0A0A' },
        variant === 'ghost' && { color: colors.text },
      ]}
    >
      {title}
    </Text>
  );

  return (
    <Pressable
      disabled={disabled || loading}
      onPressIn={() => { if (!disabled && !loading) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      style={({ pressed }) => [
        (pressed || disabled || loading) && { opacity: 0.65 },
        style as object,
      ]}
      {...rest}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, styles.buttonGradient]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            variant === 'primary' && styles.buttonPrimary,
            variant === 'ghost' && styles.buttonGhost,
            variant === 'danger' && styles.buttonDanger,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function SystemInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      style={styles.input}
      {...props}
    />
  );
}

export function RankBadge({ rank, size = 44 }: { rank: HunterRank; size?: number }) {
  const color = rankColors[rank];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: color,
        backgroundColor: colors.bgElevated,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: color, shadowOpacity: 0.7, shadowRadius: 10, elevation: 5,
      }}
    >
      <Text style={{ color, fontSize: size * 0.45, fontWeight: '900' }}>{rank}</Text>
    </View>
  );
}

export function ProgressBar({ progress, color, height = 8 }: { progress: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
      {color ? (
        <View style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: height / 2 }} />
      ) : (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2 }}
        />
      )}
    </View>
  );
}

export function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { ...panel, marginBottom: spacing.md },
  windowInner: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 0,
  },
  display: {
    color: colors.text, fontSize: 40, fontWeight: '900',
    letterSpacing: -1, lineHeight: 44,
  },
  title: {
    color: colors.text, fontSize: 20, fontWeight: '800',
    letterSpacing: 0.2, marginBottom: spacing.sm,
  },
  label: {
    color: colors.textDim, fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 6,
  },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },

  // Chip pill
  pill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: colors.panelBorder,
    borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, gap: 7,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  // Cápsula aurora (fondo decorativo)
  capsule: {
    position: 'absolute', width: 340, height: 150,
    borderRadius: radius.pill, opacity: 0.55,
  },

  // Botones — pill
  button: {
    borderRadius: radius.pill, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm,
  },
  buttonPrimary: { backgroundColor: colors.white },
  buttonGradient: {},
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.panelBorder },
  buttonDanger: { backgroundColor: 'rgba(251,113,133,0.14)', borderWidth: 1, borderColor: colors.danger },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },

  // Input — subrayado fino, sin caja (estilo Savee)
  input: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1, borderBottomColor: colors.panelBorder,
    paddingHorizontal: 2, paddingVertical: 12,
    color: colors.text, fontSize: 17, marginBottom: spacing.sm,
  },

  barTrack: { backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', flex: 1 },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelBorder,
  },
  statLabel: { color: colors.textDim, fontSize: 14 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
