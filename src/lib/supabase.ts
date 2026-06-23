import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Storage seguro para native (AsyncStorage), web (localStorage) y SSR (noop)
const noopStorage = {
  getItem: async (_key: string) => null as string | null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

function resolveStorage() {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return noopStorage; // SSR
    return {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: async (key: string) => window.localStorage.removeItem(key),
    };
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export const supabase = createClient(url, anonKey, {
  db: { schema: 'hunterfit' },
  auth: {
    storage: resolveStorage(),
    autoRefreshToken: true,
    persistSession: true,
    // En web: true para que Supabase procese el code PKCE automáticamente al cargar /auth/callback
    // En native: false porque usamos WebBrowser.openAuthSessionAsync + exchangeCodeForSession manual
    detectSessionInUrl: Platform.OS === 'web',
  },
});
