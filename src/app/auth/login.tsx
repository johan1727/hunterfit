/**
 * ANCHOR: Aurora Maximalism
 * Por qué no Industrial (el safe default para fitness): Industrial produce otra app
 * oscura con mono y un color semáforo. Aurora convierte el login en un evento —
 * la "ventana del Sistema" de Solo Leveling materializándose del vacío.
 *
 * DIFFERENTIATOR: El panel central tiene borde de gradiente vivo (1.5 px LinearGradient
 * wrap azul→violeta→rosa). Solo este panel lo tiene. El resto de la pantalla es
 * negro puro. El ojo va ahí primero, igual que en el juego donde el cuadro azul
 * aparece de la nada frente al protagonista.
 */
import { useState } from 'react';
import { View, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useDemoStore } from '../../lib/demoStore';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemInput,
  SystemButton,
  SystemText,
  SystemLabel,
  SystemWindowPanel,
} from '../../components/system';
import { Text as RNText } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const enterDemo = useDemoStore((s) => s.enterDemo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />

      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo / nombre */}
        <View style={styles.logo}>
          <Pill dotColor={gradients.brand[0]}>Sistema de cazadores</Pill>
          <GradientText style={styles.appName}>Hunter{'\n'}Fit</GradientText>
        </View>

        {/* System Window Panel — el differentiator Aurora */}
        <SystemWindowPanel style={styles.card}>
          <SystemText dim style={styles.cardEyebrow}>Acceso al Sistema</SystemText>

          <SystemLabel>Correo</SystemLabel>
          <SystemInput
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <SystemLabel style={{ marginTop: spacing.md }}>Contraseña</SystemLabel>
          <SystemInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          {error ? (
            <SystemText style={{ color: colors.danger, marginTop: spacing.sm, fontSize: 13 }}>
              {error}
            </SystemText>
          ) : null}

          <SystemButton
            title="Entrar"
            variant="gradient"
            loading={loading}
            onPress={handleLogin}
            style={{ marginTop: spacing.lg }}
          />

          <SystemButton
            title="Crear cuenta"
            variant="ghost"
            disabled={loading}
            onPress={() => router.push('/auth/signup')}
          />
        </SystemWindowPanel>

        {/* Demo — sin cuenta */}
        <View style={styles.demoRow}>
          <SystemText dim style={{ fontSize: 13 }}>¿Solo quieres explorar?  </SystemText>
          <RNText style={{ fontSize: 13, color: colors.glow }} onPress={enterDemo}>
            Entrar sin cuenta →
          </RNText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  logo: { gap: spacing.md },
  appName: { fontSize: 56, lineHeight: 58, fontWeight: '900' },
  cardEyebrow: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.lg },
  card: { gap: 0 },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
});
