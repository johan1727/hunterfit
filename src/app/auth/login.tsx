import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { useDemoStore } from '../../lib/demoStore';
import { colors, gradients, spacing, radius } from '../../theme/system';
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

WebBrowser.maybeCompleteAuthSession();

function getRedirectTo() {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`;
  }
  return 'hunterfit://auth/callback';
}

export default function LoginScreen() {
  const router = useRouter();
  const enterDemo = useDemoStore((s) => s.enterDemo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleLogin() {
    setError('');
    setNeedsConfirm(false);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      if (/confirm/i.test(err.message)) setNeedsConfirm(true);
    }
  }

  async function handleResendConfirm() {
    if (!email) return;
    setResending(true);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    setError(err ? err.message : 'Correo de confirmación reenviado. Revisa tu bandeja.');
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      const redirectTo = getRedirectTo();

      if (Platform.OS === 'web') {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        return; // página redirige, no hay más código que ejecutar
      }

      // Native: abrir en browser nativo
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthErr) throw oauthErr;
      if (!data.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && 'url' in result) {
        await supabase.auth.exchangeCodeForSession(result.url);
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar con Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleDemo() {
    enterDemo();
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />

      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View style={styles.logo}>
          <Pill dotColor={gradients.brand[0]}>Sistema de cazadores</Pill>
          <GradientText style={styles.appName}>Hunter{'\n'}Fit</GradientText>
        </View>

        {/* Panel principal */}
        <SystemWindowPanel style={styles.card}>
          <SystemText dim style={styles.cardEyebrow}>Acceso al Sistema</SystemText>

          {/* Google */}
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            <SystemText style={styles.googleIcon}>G</SystemText>
            <SystemText style={styles.googleLabel}>
              {googleLoading ? 'Conectando…' : 'Continuar con Google'}
            </SystemText>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <SystemText dim style={styles.dividerText}>o con email</SystemText>
            <View style={styles.dividerLine} />
          </View>

          <SystemLabel>Correo</SystemLabel>
          <SystemInput
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            editable={!loading && !googleLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <SystemLabel style={{ marginTop: spacing.md }}>Contraseña</SystemLabel>
          <SystemInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading && !googleLoading}
          />

          {error ? (
            <SystemText style={{ color: colors.danger, marginTop: spacing.sm, fontSize: 13 }}>
              {error}
            </SystemText>
          ) : null}

          {needsConfirm && (
            <SystemButton
              title={resending ? 'Reenviando…' : 'Reenviar correo de confirmación'}
              variant="ghost"
              loading={resending}
              onPress={handleResendConfirm}
              style={{ marginTop: spacing.sm }}
            />
          )}

          <SystemButton
            title="Entrar"
            variant="gradient"
            loading={loading}
            disabled={googleLoading}
            onPress={handleLogin}
            style={{ marginTop: spacing.lg }}
          />

          <SystemButton
            title="Crear cuenta"
            variant="ghost"
            disabled={loading || googleLoading}
            onPress={() => router.push('/auth/signup')}
          />
        </SystemWindowPanel>

        {/* Demo */}
        <View style={styles.demoRow}>
          <SystemText dim style={{ fontSize: 13 }}>¿Solo quieres explorar?  </SystemText>
          <RNText style={{ fontSize: 13, color: colors.glow }} onPress={handleDemo}>
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
  cardEyebrow: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.md },
  card: { gap: 0 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.panelBorder },
  dividerText: { fontSize: 12 },

  demoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
});
