import { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/system';
import { AuroraBackground, SystemText } from '../../components/system';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Con detectSessionInUrl: true, Supabase ya procesó el code PKCE al cargar esta página.
    // Solo necesitamos esperar a que la sesión esté lista y navegar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        subscription.unsubscribe();
        router.replace('/');
      }
    });

    // Fallback: si en 4s no hay evento, navegar igual (el layout detectará la sesión)
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace('/');
    }, 4000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={styles.root}>
      <AuroraBackground />
      <SystemText dim style={styles.label}>Verificando acceso…</SystemText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16 },
});
