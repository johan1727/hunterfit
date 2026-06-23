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
