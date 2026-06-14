import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { base64ToUint8Array } from '../../lib/base64';
import { analyzeBodyPhoto } from '../../services/ai';
import { colors, spacing } from '../../theme/system';
import { SystemPanel, SystemTitle, SystemText, SystemButton } from '../../components/system';

export default function BodyPhotoScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const updateProfile = useUpdateProfile(userId);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      aspect: [3, 4],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleComplete() {
    await updateProfile.mutateAsync({ onboarding_complete: true });
    router.replace('/(tabs)/home');
  }

  async function handleUploadAndAnalyze() {
    if (!photoUri) {
      Alert.alert('Error', 'Por favor toma una foto primero');
      return;
    }

    setUploading(true);
    try {
      // Leer imagen como base64
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Guardar en Storage como bytes
      const timestamp = Date.now();
      const fileName = `${userId}/body_${timestamp}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('hunterfit-body-photos')
        .upload(fileName, base64ToUint8Array(base64).buffer as ArrayBuffer, {
          contentType: 'image/jpeg',
        });

      if (uploadErr) throw uploadErr;

      // Llamar a analyze-body
      const analysis = await analyzeBodyPhoto(base64, 'image/jpeg');
      await updateProfile.mutateAsync({
        onboarding_complete: true,
        body_analysis: analysis,
      });

      setPhotoUri(null);
      router.replace('/(tabs)/home');
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'No se pudo analizar la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SystemPanel style={styles.header}>
          <SystemTitle>FOTO CORPORAL (OPCIONAL)</SystemTitle>
          <SystemText>Ayuda a personalizar tu entrenamiento (puedes saltarlo)</SystemText>
        </SystemPanel>

        <SystemPanel>
          <SystemText style={{ marginBottom: spacing.md }}>
            Una foto de tu cuerpo (con playera) ayudará a ajustar mejor tu rutina según tu tipo corporal.
          </SystemText>

          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.preview} />
              <SystemButton
                title="CAMBIAR FOTO"
                variant="ghost"
                onPress={pickImage}
                disabled={uploading}
              />
              <SystemButton
                title="ANALIZAR Y CONTINUAR (PREMIUM)"
                loading={uploading}
                onPress={handleUploadAndAnalyze}
              />
            </>
          ) : (
            <SystemButton title="TOMAR FOTO" onPress={pickImage} />
          )}
        </SystemPanel>

        <SystemPanel>
          <SystemButton
            title="CONTINUAR SIN FOTO"
            variant="ghost"
            onPress={handleComplete}
            disabled={uploading}
          />
        </SystemPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingTop: spacing.lg },
  header: { marginBottom: spacing.lg },
  preview: { width: '100%', height: 400, borderRadius: 10, marginBottom: spacing.lg },
});
