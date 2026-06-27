import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '../theme/system';

/**
 * HudPanel — panel hero del "Sistema": borde de gradiente vivo + 4 corner-brackets
 * glow en las esquinas + halo neón opcional. Es el marco del elemento dominante
 * de cada pantalla. Un solo HudPanel por pantalla (jerarquía de glow).
 */
export function HudPanel({ style, children, glow = true, borderWidth = 1.5 }: ViewProps & { glow?: boolean; borderWidth?: number }) {
  return (
    <View style={glow ? styles.glowWrap : undefined}>
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg + borderWidth, padding: borderWidth }}
      >
        <View style={[styles.inner, style]}>
          {children}
          {/* Corner brackets */}
          <Bracket pos="tl" />
          <Bracket pos="tr" />
          <Bracket pos="bl" />
          <Bracket pos="br" />
        </View>
      </LinearGradient>
    </View>
  );
}

function Bracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos[0] === 't';
  const left = pos[1] === 'l';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.bracket,
        top ? { top: 6 } : { bottom: 6 },
        left ? { left: 6 } : { right: 6 },
        {
          borderTopWidth: top ? 2 : 0,
          borderBottomWidth: top ? 0 : 2,
          borderLeftWidth: left ? 2 : 0,
          borderRightWidth: left ? 0 : 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    borderRadius: radius.lg,
    shadowColor: colors.glow,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  inner: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  bracket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: colors.glow,
  },
});
