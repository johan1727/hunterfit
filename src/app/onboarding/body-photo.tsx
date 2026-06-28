import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Image, Alert, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/useData';
import { useHunterData } from '../../hooks/useHunterData';
import { supabase } from '../../lib/supabase';
import { base64ToUint8Array } from '../../lib/base64';
import { analyzeBodyPhoto } from '../../services/ai';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground,
  GradientText,
  Pill,
  SystemPanel,
  SystemText,
  SystemButton,
  SystemWindowPanel,
} from '../../components/system';

export default function BodyPhotoScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { profile } = useHunterData();
  const isPremium = profile?.is_premium ?? false;
  const updateProfile = useUpdateProfile(userId);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  }

  async function handleComplete() {
    await updateProfile.mutateAsync({ onboarding_complete: true });
    router.replace('/(tabs)/home');
  }

  async function handleUploadAndAnalyze() {
    if (!photoUri) return;
    setUploading(true);
    try {
      if (!photoBase64) throw new Error('No base64 disponible');
      const base64 = photoBase64;
      const timestamp = Date.now();
      const fileName = `${userId}/body_${timestamp}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('hunterfit-body-photos')
        .upload(fileName, base64ToUint8Array(base64).buffer as ArrayBuffer, {
          contentType: 'image/jpeg',
        });
      if (uploadErr) throw uploadErr;
      const analysis = await analyzeBodyPhoto(base64, 'image/jpeg');
      await updateProfile.mutateAsync({ onboarding_complete: true, body_analysis: analysis });
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'No se pudo analizar la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={gradients.brand[2]}>Opcional</Pill>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <SystemText dim style={{ fontSize: 14 }}>← Atrás</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Foto{'\n'}corporal</GradientText>
          <SystemText dim style={{ fontSize: 14, lineHeight: 22 }}>
            Una foto con playera ayuda a la IA a personalizar tus rutinas según tu tipo de cuerpo.
          </SystemText>
        </Animated.View>

        {/* Card principal */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <SystemWindowPanel style={styles.card}>
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <SystemButton title="Cambiar foto" variant="ghost" onPress={pickImage} disabled={uploading} />
                <SystemButton
                  title={
                    uploading
                      ? 'Analizando…'
                      : isPremium
                        ? '✦ Analizar con IA'
                        : '👑 Analizar con IA (Premium)'
                  }
                  variant="gradient"
                  loading={uploading}
                  onPress={isPremium ? handleUploadAndAnalyze : () => router.push('/premium/upgrade')}
                />
              </>
            ) : (
              <View style={styles.placeholder}>
                {/* Ícono de cuerpo */}
                <View style={styles.bodyIcon}>
                  <LinearGradient
                    colors={gradients.brand as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.bodyIconGrad}
                  >
                    <Ionicons name="body" size={52} color="#fff" />
                  </LinearGradient>
                </View>

                <SystemText style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
                  La IA analiza tu cuerpo
                </SystemText>
                <SystemText dim style={{ fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg }}>
                  Detecta tu tipo corporal, grupos musculares a priorizar y ajusta tu rutina automáticamente.
                </SystemText>

                <SystemButton title="Tomar foto" variant="gradient" onPress={pickImage} />
              </View>
            )}
          </SystemWindowPanel>
        </Animated.View>

        {/* Saltar */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <SystemButton
            title="Continuar sin foto →"
            variant="ghost"
            onPress={handleComplete}
            disabled={uploading}
          />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 60 },

  header: { gap: spacing.sm },
  title: { fontSize: 48, lineHeight: 52, fontWeight: '900' },

  card: {},
  placeholder: { alignItems: 'center', paddingVertical: spacing.lg },
  bodyIcon: {
    marginBottom: spacing.lg,
    width: 100, height: 100, borderRadius: 50,
    shadowColor: gradients.brand[0],
    shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 6 },
  },
  bodyIconGrad: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  preview: { width: '100%', height: 340, borderRadius: radius.lg, marginBottom: spacing.md },
});
