import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export function useAuthGuard() {
  const router = useRouter();

  const handleAuthError = (error: any, context?: string) => {
    const isForbidden = error?.code === '403' || error?.status === 403;
    const isUnauthorized = error?.code === '401' || error?.status === 401;

    if (isForbidden || isUnauthorized) {
      Alert.alert(
        'Inicia sesión',
        `${context || 'Esta acción'} requiere que inicies sesión`,
        [
          {
            text: 'Cancelar',
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: 'Ir a login',
            onPress: () => router.push('/auth/login'),
            style: 'default',
          },
        ],
      );
      return true;
    }
    return false;
  };

  return { handleAuthError };
}
