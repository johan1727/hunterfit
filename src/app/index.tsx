import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useData';

export default function Index() {
  const { session, loading } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user?.id ?? null);

  if (loading || (session && isLoading)) return null;
  if (!session) return <Redirect href="/auth/login" />;
  if (!profile?.onboarding_complete) return <Redirect href="/onboarding/quiz" />;
  return <Redirect href="/(tabs)/home" />;
}
