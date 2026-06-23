# UX Improvements: Empty States, Network Errors, Input Validation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make HunterFit feel polished by handling empty states gracefully, catching network errors with friendly messages, and validating inputs in real-time.

**Architecture:** 
- Create utility hooks: `useNetworkError()`, `useEmptyState()` for reuse across screens
- Add validation helpers in `src/lib/validation.ts`
- Update 5 key screens: auth/signup, nutrition/search, workout history, badges, leaderboard
- Use React Query's error handling + Supabase error codes to categorize failures

**Tech Stack:** React Native, Supabase (error codes 400/401/403/404/500), React Query, Zustand

---

## Task 1: Create Network Error Handling Utility

**Files:**
- Create: `src/lib/networkError.ts`

**Step 1: Write the utility**

```typescript
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface NetworkError {
  code?: string | number;
  status?: number;
  message?: string;
}

export function useNetworkError() {
  const router = useRouter();

  const handleError = (error: NetworkError | any, context?: string): boolean => {
    // Auth errors (401/403)
    if (error?.status === 401 || error?.code === '401') {
      Alert.alert('Sesión expirada', 'Por favor inicia sesión de nuevo', [
        { text: 'OK', onPress: () => router.push('/auth/login') },
      ]);
      return true;
    }

    if (error?.status === 403 || error?.code === '403') {
      Alert.alert('Acceso denegado', `Necesitas iniciar sesión para ${context || 'hacer esto'}`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir a login', onPress: () => router.push('/auth/login') },
      ]);
      return true;
    }

    // Network errors (4xx/5xx)
    if (error?.status === 404 || error?.code === '404') {
      Alert.alert('No encontrado', 'El recurso que buscas no existe');
      return true;
    }

    if (error?.status >= 500) {
      Alert.alert('Error del servidor', 'Nuestros servidores están actualizando. Intenta más tarde.');
      return true;
    }

    if (error?.message?.includes('timeout') || error?.message?.includes('Network request failed')) {
      Alert.alert('Sin conexión', 'Verifica tu conexión a internet', [
        { text: 'Reintentar' },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return true;
    }

    return false;
  };

  return { handleError };
}
```

**Step 2: Test the utility (manual)**

Navigate to a screen and trigger errors to verify alerts display correctly.

Expected: 
- 403 → "Acceso denegado" + "Ir a login"
- 500 → "Error del servidor"
- Network timeout → "Sin conexión"

**Step 3: Commit**

```bash
git add src/lib/networkError.ts
git commit -m "feat: add network error handling utility"
```

---

## Task 2: Create Empty State Component & Hook

**Files:**
- Create: `src/components/EmptyState.tsx`
- Create: `src/lib/emptyState.ts`

**Step 1: Create EmptyState component**

```typescript
// src/components/EmptyState.tsx
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../theme/system';
import { SystemText, SystemButton } from './system';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  cta?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, cta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <SystemText style={styles.icon}>{icon}</SystemText>
      <SystemText style={styles.title}>{title}</SystemText>
      <SystemText dim style={styles.subtitle}>{subtitle}</SystemText>
      {cta && (
        <SystemButton
          title={cta.label}
          variant="gradient"
          onPress={cta.onPress}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  icon: { fontSize: 56 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  button: { marginTop: spacing.md, alignSelf: 'center', minWidth: 200 },
});
```

**Step 2: Create empty state definitions**

```typescript
// src/lib/emptyState.ts
export const EMPTY_STATES = {
  workouts: {
    icon: '⚔️',
    title: 'Sin entrenamientos',
    subtitle: 'Comienza tu primer entrenamiento para ganar XP',
  },
  meals: {
    icon: '🍽️',
    title: 'Sin comidas registradas',
    subtitle: 'Busca y agrega alimentos para completar tu nutrición',
  },
  badges: {
    icon: '🏅',
    title: 'Sin logros aún',
    subtitle: 'Completa entrenamientos y nutrición para desbloquear badges',
  },
  leaderboard: {
    icon: '🏆',
    title: 'Sin ranking',
    subtitle: 'Completa entrenamientos para aparecer en el ranking',
  },
};
```

**Step 3: Test component**

Use Storybook or manually render in a dev screen.

Expected: Icon + title + subtitle display centered with optional button.

**Step 4: Commit**

```bash
git add src/components/EmptyState.tsx src/lib/emptyState.ts
git commit -m "feat: add empty state component and definitions"
```

---

## Task 3: Add Empty States to 5 Key Screens

**Files:**
- Modify: `src/app/(tabs)/workouts.tsx`
- Modify: `src/app/nutrition/search.tsx`
- Modify: `src/app/profile/badges.tsx`
- Modify: `src/app/social/leaderboard.tsx`
- Modify: `src/app/workout/history.tsx`

**Step 1: Update workouts.tsx**

```typescript
import { EmptyState } from '../../components/EmptyState';
import { EMPTY_STATES } from '../../lib/emptyState';

// In render:
{!isDemo && routines.length === 0 ? (
  <EmptyState
    {...EMPTY_STATES.workouts}
    cta={{ label: 'Ver rutinas', onPress: () => router.push('/routines') }}
  />
) : (
  // existing list
)}
```

**Step 2: Update nutrition/search.tsx**

```typescript
import { EmptyState } from '../../components/EmptyState';

// After favorites, before manual CTA:
{!showManual && searchTerm.length < 2 && foods.length === 0 && (favorites.data?.length ?? 0) === 0 && (
  <EmptyState
    {...EMPTY_STATES.meals}
    cta={{ label: 'Buscar alimentos', onPress: () => setSearchTerm('pollo') }}
  />
)}
```

**Step 3: Update badges.tsx**

```typescript
{userBadges.length === 0 ? (
  <EmptyState
    {...EMPTY_STATES.badges}
    cta={{ label: 'Ver misiones', onPress: () => router.push('/(tabs)/home') }}
  />
) : (
  // existing grid
)}
```

**Step 4: Update leaderboard.tsx**

```typescript
{entries.length === 0 ? (
  <EmptyState
    {...EMPTY_STATES.leaderboard}
    cta={{ label: 'Ir al inicio', onPress: () => router.replace('/(tabs)/home') }}
  />
) : (
  // existing podium
)}
```

**Step 5: Update workout/history.tsx**

```typescript
{workoutSessions.length === 0 ? (
  <EmptyState
    {...EMPTY_STATES.workouts}
    cta={{ label: 'Comenzar entrenamiento', onPress: () => router.push('/(tabs)/workouts') }}
  />
) : (
  // existing list
)}
```

**Step 6: Test each screen**

- Delete/clear data or use test account with no activity
- Expected: Empty state with icon, title, CTA button visible

**Step 7: Commit**

```bash
git add src/app/(tabs)/workouts.tsx src/app/nutrition/search.tsx src/app/profile/badges.tsx src/app/social/leaderboard.tsx src/app/workout/history.tsx
git commit -m "feat: add empty states to 5 key screens"
```

---

## Task 4: Create Input Validation Utility

**Files:**
- Create: `src/lib/validation.ts`

**Step 1: Write validation helpers**

```typescript
// src/lib/validation.ts
export const validation = {
  email: (email: string): { valid: boolean; error?: string } => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return { valid: false, error: 'Email es requerido' };
    if (!regex.test(email)) return { valid: false, error: 'Email inválido' };
    return { valid: true };
  },

  password: (password: string): { valid: boolean; error?: string } => {
    if (!password) return { valid: false, error: 'Contraseña es requerida' };
    if (password.length < 8) return { valid: false, error: 'Mínimo 8 caracteres' };
    return { valid: true };
  },

  username: (username: string): { valid: boolean; error?: string } => {
    if (!username) return { valid: false, error: 'Nombre de usuario es requerido' };
    if (username.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' };
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Solo letras, números, _ y -' };
    }
    return { valid: true };
  },

  confirmPassword: (pw: string, confirmPw: string): { valid: boolean; error?: string } => {
    if (pw !== confirmPw) return { valid: false, error: 'Las contraseñas no coinciden' };
    return { valid: true };
  },
};
```

**Step 2: Test validation**

```typescript
// Manual test in console:
// validation.email('test@example.com') → { valid: true }
// validation.email('invalid') → { valid: false, error: '...' }
// validation.password('short') → { valid: false, error: 'Mínimo 8 caracteres' }
```

Expected: Returns `{ valid: boolean; error?: string }` for each input.

**Step 3: Commit**

```bash
git add src/lib/validation.ts
git commit -m "feat: add input validation helpers"
```

---

## Task 5: Add Real-time Validation to Auth/Signup

**Files:**
- Modify: `src/app/auth/signup.tsx`

**Step 1: Update signup form**

```typescript
import { validation } from '../../lib/validation';

// In component:
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState<string | null>(null);
const [password, setPassword] = useState('');
const [passwordError, setPasswordError] = useState<string | null>(null);

const handleEmailChange = (text: string) => {
  setEmail(text);
  const result = validation.email(text);
  setEmailError(result.valid ? null : result.error);
};

const handlePasswordChange = (text: string) => {
  setPassword(text);
  const result = validation.password(text);
  setPasswordError(result.valid ? null : result.error);
};

// In render (replace existing inputs):
<SystemInput
  placeholder="Email"
  value={email}
  onChangeText={handleEmailChange}
  keyboardType="email-address"
/>
{emailError && <SystemText style={{ color: colors.danger, fontSize: 12 }}>{emailError}</SystemText>}

<SystemInput
  placeholder="Contraseña (mín. 8 caracteres)"
  value={password}
  onChangeText={handlePasswordChange}
  secureTextEntry
/>
{passwordError && <SystemText style={{ color: colors.danger, fontSize: 12 }}>{passwordError}</SystemText>}
```

**Step 2: Test form**

- Type invalid email → Error shows inline
- Type < 8 chars password → Error shows inline
- Fix → Error disappears

Expected: Errors appear/disappear in real-time.

**Step 3: Commit**

```bash
git add src/app/auth/signup.tsx
git commit -m "feat: add real-time validation to signup form"
```

---

## Task 6: Update Network Error Handlers in Key Screens

**Files:**
- Modify: `src/app/workout/[id].tsx` (already has useAuthGuard, upgrade it)
- Modify: `src/app/nutrition/search.tsx` (already has useAuthGuard, upgrade it)

**Step 1: Replace useAuthGuard with useNetworkError**

In both files:

```typescript
import { useNetworkError } from '../../lib/networkError';

// In component:
const { handleError } = useNetworkError();

// In catch blocks:
} catch (err: any) {
  const handled = handleError(err, 'Guardar entrenamiento');
  if (!handled) {
    Alert.alert('Error', 'No se pudo completar la acción');
  }
}
```

**Step 2: Test with simulated errors**

- Offline (DevTools) → See "Sin conexión" alert
- 500 error (mock Supabase) → See "Error del servidor"
- 403 without auth → See "Acceso denegado"

Expected: Each error type shows appropriate message.

**Step 3: Commit**

```bash
git add src/app/workout/[id].tsx src/app/nutrition/search.tsx
git commit -m "feat: upgrade network error handling with useNetworkError"
```

---

## Task 7: Verification & Manual Testing

**Test Plan:**

1. **Empty States:**
   - [ ] Workouts: Delete all routines → See empty state
   - [ ] Nutrition: Fresh account → See empty state
   - [ ] Badges: New user → See empty state
   - [ ] Leaderboard: No data → See empty state

2. **Input Validation:**
   - [ ] Signup: Type invalid email → Error shows
   - [ ] Signup: Fix email → Error disappears
   - [ ] Signup: Type short password → Error shows

3. **Network Errors:**
   - [ ] Go offline (DevTools) → Try to save workout → "Sin conexión" alert
   - [ ] Restart server → Try save → "Error del servidor" alert
   - [ ] Not logged in web → Try save → "Acceso denegado" alert

**Expected:** All 15 checks pass. App feels polished.

**Step 1: Run manual tests**

Navigate through each screen listed above.

**Step 2: Final commit (if any fixes)**

```bash
git add .
git commit -m "test: verify all ux improvements working end-to-end"
```

---

## Summary

**Total tasks:** 7  
**Total commits:** 7  
**Estimated time:** 2-3 hours  
**Impact:** High — HunterFit goes from "feels broken" → "feels professional"

**Files created:** 2 (networkError.ts, EmptyState.tsx, emptyState.ts)  
**Files modified:** 5 (signup.tsx, search.tsx, badges.tsx, leaderboard.tsx, workout/[id].tsx, history.tsx)
