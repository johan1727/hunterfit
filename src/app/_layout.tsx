import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useData';
import { initRevenueCat } from '../lib/revenuecat';
import { useDemoStore } from '../lib/demoStore';
import { useLevelUpStore } from '../lib/levelUpStore';
import { LevelUpModal } from '../components/LevelUpModal';
import { BadgeToast } from '../components/BadgeToast';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RootNavigator />
        <LevelUpOverlay />
        <BadgeToast />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function LevelUpOverlay() {
  const pendingLevel = useLevelUpStore((s) => s.pendingLevel);
  const dismiss = useLevelUpStore((s) => s.dismissLevelUp);
  return (
    <LevelUpModal
      visible={pendingLevel !== null}
      level={pendingLevel ?? 0}
      onClose={dismiss}
    />
  );
}

function RootNavigator() {
  const router = useRouter();
  const isDemo = useDemoStore((s) => s.isDemo);
  const { session, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(
    isDemo ? null : (session?.user?.id ?? null),
  );

  const isLoggedIn = !!session;
  const onboardingComplete = profile?.onboarding_complete ?? false;

  // Inicializar RevenueCat (no-op en web) cuando hay sesión
  useEffect(() => {
    if (session?.user?.id) initRevenueCat(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (isDemo || (!authLoading && !profileLoading)) {
      SplashScreen.hideAsync();
    }
  }, [isDemo, authLoading, profileLoading]);

  // Redirect una vez que sabemos el estado del usuario
  useEffect(() => {
    if (authLoading || profileLoading || isDemo) return;
    if (!isLoggedIn) {
      router.replace('/auth/login');
    } else if (!onboardingComplete) {
      router.replace('/onboarding/quiz');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [authLoading, profileLoading, isLoggedIn, onboardingComplete, isDemo]);

  // Todas las pantallas siempre disponibles; los redirects de arriba controlan el flujo
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="onboarding/quiz" />
      <Stack.Screen name="onboarding/character-select" />
      <Stack.Screen name="onboarding/body-photo" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="nutrition/search" />
      <Stack.Screen name="nutrition/barcode" />
      <Stack.Screen name="nutrition/macro-calc" />
      <Stack.Screen name="nutrition/shopping" />
      <Stack.Screen name="nutrition/meal-plan" />
      <Stack.Screen name="profile/photos" />
      <Stack.Screen name="workout/history" />
      <Stack.Screen name="nutrition/add" />
      <Stack.Screen name="nutrition/edit/[id]" />
      <Stack.Screen name="nutrition/recipes" />
      <Stack.Screen name="profile/health" />
      <Stack.Screen name="profile/badges" />
      <Stack.Screen name="social/leaderboard" />
      <Stack.Screen name="premium/upgrade" />
      <Stack.Screen name="premium/family" />
    </Stack>
  );
}
