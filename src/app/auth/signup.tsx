import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { validation } from '../../lib/validation';
import { colors, gradients, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill,
  SystemInput, SystemButton, SystemText, SystemLabel, SystemWindowPanel,
} from '../../components/system';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSignup() {
    setMsg(null);
    if (password !== confirm) { setMsg({ text: 'Las contraseñas no coinciden', ok: false }); return; }
    if (password.length < 6) { setMsg({ text: 'Mínimo 6 caracteres', ok: false }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMsg({ text: error.message, ok: false });
    } else {
      setPendingEmail(email);
      setMsg({ text: `Te enviamos un correo a ${email}. Ábrelo para confirmar tu cuenta.`, ok: true });
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    setResending(false);
    setMsg(error
      ? { text: error.message, ok: false }
      : { text: 'Correo reenviado. Revisa tu bandeja (y spam).', ok: true });
  }

  const handleEmailChange = (text: string) => {
    setEmail(text);
    const result = validation.email(text);
    setEmailError(result.valid ? null : result.error || null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const result = validation.password(text);
    setPasswordError(result.valid ? null : result.error || null);
  };

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logo}>
          <Pill dotColor={gradients.brand[2]}>Únete al Sistema</Pill>
          <GradientText style={styles.appName}>Crea tu{'\n'}cuenta</GradientText>
        </View>

        <SystemWindowPanel style={styles.card}>
          <SystemText dim style={styles.eyebrow}>Registro de cazador</SystemText>

          <SystemLabel>Correo</SystemLabel>
          <SystemInput
            placeholder="Email"
            value={email}
            onChangeText={handleEmailChange}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {emailError && <SystemText style={{ color: colors.danger, fontSize: 12 }}>{emailError}</SystemText>}

          <SystemLabel style={{ marginTop: spacing.md }}>Contraseña</SystemLabel>
          <SystemInput
            placeholder="Contraseña (mín. 8 caracteres)"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            editable={!loading}
          />
          {passwordError && <SystemText style={{ color: colors.danger, fontSize: 12 }}>{passwordError}</SystemText>}

          <SystemLabel style={{ marginTop: spacing.md }}>Confirmar contraseña</SystemLabel>
          <SystemInput
            placeholder="Repite tu contraseña"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!loading}
          />

          {msg ? (
            <SystemText style={{ color: msg.ok ? colors.success : colors.danger, fontSize: 13, marginTop: spacing.sm }}>
              {msg.text}
            </SystemText>
          ) : null}

          {pendingEmail ? (
            <SystemButton
              title={resending ? 'Reenviando…' : 'Reenviar correo de confirmación'}
              variant="ghost"
              loading={resending}
              onPress={handleResend}
              style={{ marginTop: spacing.lg }}
            />
          ) : (
            <SystemButton
              title="Crear cuenta"
              variant="gradient"
              loading={loading}
              onPress={handleSignup}
              style={{ marginTop: spacing.lg }}
            />
          )}

          <SystemButton
            title="Ya tengo cuenta"
            variant="ghost"
            disabled={loading}
            onPress={() => router.push('/auth/login')}
          />
        </SystemWindowPanel>

        <View style={styles.footer}>
          <SystemText dim style={{ fontSize: 13 }}>¿Ya tienes cuenta?  </SystemText>
          <Text style={{ fontSize: 13, color: colors.glow }} onPress={() => router.push('/auth/login')}>
            Iniciar sesión →
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.xl },
  logo: { gap: spacing.md },
  appName: { fontSize: 48, lineHeight: 50, fontWeight: '900' },
  card: {},
  eyebrow: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: spacing.md },
});
