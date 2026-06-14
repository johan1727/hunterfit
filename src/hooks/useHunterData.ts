import { useDemoStore } from '../lib/demoStore';
import { DEMO_CHARACTER, DEMO_MEALS, DEMO_PROFILE, DEMO_QUESTS, DEMO_ROUTINES } from '../lib/demo';
import { useAuth } from './useAuth';
import { useProfile, useCharacters, useDailyQuests, useMealLogs } from './useData';
import { fetchPlan, type RoutineWithExercises } from '../services/routines';
import { localDateString } from '../lib/dates';
import { useQuery } from '@tanstack/react-query';

export function useHunterData() {
  const isDemo = useDemoStore((s) => s.isDemo);
  const { userId } = useAuth();

  const { data: realProfile } = useProfile(isDemo ? null : userId);
  const { data: realCharacters = [] } = useCharacters();
  const { data: realQuests = [] } = useDailyQuests(
    isDemo ? null : userId,
    isDemo ? undefined : realProfile?.level,
  );
  const today = localDateString();
  const { data: realMeals = [] } = useMealLogs(isDemo ? null : userId, today);
  const { data: realRoutines = [] } = useQuery<RoutineWithExercises[]>({
    queryKey: ['routines', userId],
    enabled: !isDemo && !!userId,
    queryFn: () => fetchPlan(userId!),
  });

  if (isDemo) {
    return {
      profile: DEMO_PROFILE,
      character: DEMO_CHARACTER,
      quests: DEMO_QUESTS,
      meals: DEMO_MEALS,
      routines: DEMO_ROUTINES,
      isDemo: true,
      userId: null as string | null,
    };
  }

  const character = realCharacters.find((c) => c.id === realProfile?.active_character_id) ?? null;
  return {
    profile: realProfile ?? null,
    character,
    quests: realQuests,
    meals: realMeals,
    routines: realRoutines,
    isDemo: false,
    userId,
  };
}
