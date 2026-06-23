import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AddMealScreen() {
  const { type, date } = useLocalSearchParams<{ type?: string; date?: string }>();
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (date) params.set('date', date);
    const qs = params.toString();
    router.replace((`/nutrition/search${qs ? `?${qs}` : ''}`) as any);
  }, []);
  return null;
}
