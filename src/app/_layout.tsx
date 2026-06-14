import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useData';
import { useDemoStore } from '../lib/demoStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const isDemo = useDemoStore((s) => s.isDemo);
  const { session, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(
    isDemo ? null : (session?.user?.id ?? null),
  );

  useEffect(() => {
    if (isDemo || (!authLoading && !profileLoading)) {
      SplashScreen.hideAsync();
    }
  }, [isDemo, authLoading, profileLoading]);

  // Modo demo: saltar directo a tabs con datos mock
  if (isDemo) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        {[
          <Stack.Screen key="tabs" name="(tabs)" />,
          <Stack.Screen key="workout" name="workout/[id]" />,
          <Stack.Screen key="nutrition-search" name="nutrition/search" />,
          <Stack.Screen key="nutrition-add" name="nutrition/add" />,
          <Stack.Screen key="nutrition-edit" name="nutrition/edit/[id]" />,
        ]}
      </Stack>
    );
  }

  const isLoggedIn = !!session;
  const onboardingComplete = profile?.onboarding_complete ?? false;

  const screens = !isLoggedIn
    ? [
        <Stack.Screen key="login" name="auth/login" />,
        <Stack.Screen key="signup" name="auth/signup" />,
      ]
    : !onboardingComplete
      ? [
          <Stack.Screen key="quiz" name="onboarding/quiz" />,
          <Stack.Screen key="character-select" name="onboarding/character-select" />,
          <Stack.Screen key="body-photo" name="onboarding/body-photo" />,
        ]
      : [
          <Stack.Screen key="tabs" name="(tabs)" />,
          <Stack.Screen key="workout" name="workout/[id]" />,
          <Stack.Screen key="nutrition-search" name="nutrition/search" />,
          <Stack.Screen key="nutrition-add" name="nutrition/add" />,
          <Stack.Screen key="nutrition-edit" name="nutrition/edit/[id]" />,
        ];

  return <Stack screenOptions={{ headerShown: false }}>{screens}</Stack>;
}
