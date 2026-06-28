import { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, Text, Pressable, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { base64ToUint8Array } from '../../lib/base64';
import { colors, gradients, radius, spacing } from '../../theme/system';
import {
  AuroraBackground, GradientText, Pill, SystemPanel, SystemText, SystemButton, SystemInput,
} from '../../components/system';
import { LinearGradient } from 'expo-linear-gradient';

type ProgressPhoto = {
  id: string; storage_path: string; note: string | null;
  weight_kg: number | null; taken_at: string;
};

function useProgressPhotos(userId: string | null) {
  return useQuery({
    queryKey: ['progress_photos', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProgressPhoto[]> => {
      const { data, error } = await supabase
        .from('progress_photos').select('*').eq('user_id', userId!)
        .order('taken_at', { ascending: false });
      if (error) throw error;
      return data as ProgressPhoto[];
    },
  });
}

function useAddPhoto(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, note, weight_kg }: { path: string; note?: string; weight_kg?: number }) => {
      const { error } = await supabase.from('progress_photos').insert({
        user_id: userId!, storage_path: path, note: note || null, weight_kg: weight_kg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress_photos', userId] }),
  });
}

function useDeletePhoto(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from('hunterfit-body-photos').remove([path]);
      const { error } = await supabase.from('progress_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress_photos', userId] }),
  });
}

export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const photos = useProgressPhotos(userId);
  const addPhoto = useAddPhoto(userId);
  const deletePhoto = useDeletePhoto(userId);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.75, aspect: [3, 4], base64: true,
    });
    if (!result.canceled) {
      setSelectedUri(result.assets[0].uri);
      setSelectedBase64(result.assets[0].base64 ?? null);
      setShowForm(true);
    }
  }

  async function handleSave() {
    if (!selectedUri) return;
    setUploading(true);
    try {
      if (!selectedBase64) throw new Error('No base64 disponible');
      const base64 = selectedBase64;
      const timestamp = Date.now();
      const path = `${userId}/progress_${timestamp}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('hunterfit-body-photos')
        .upload(path, base64ToUint8Array(base64).buffer as ArrayBuffer, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      await addPhoto.mutateAsync({ path, note: note.trim() || undefined });
      setShowForm(false);
      setSelectedUri(null);
      setSelectedBase64(null);
      setNote('');
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(photo: ProgressPhoto) {
    Alert.alert('Eliminar foto', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deletePhoto.mutate({ id: photo.id, path: photo.storage_path }) },
    ]);
  }

  function getPublicUrl(path: string) {
    const { data } = supabase.storage.from('hunterfit-body-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pill dotColor={gradients.brand[2]}>Progreso</Pill>
            <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
              <SystemText dim style={{ fontSize: 14 }}>← Atrás</SystemText>
            </Pressable>
          </View>
          <GradientText style={styles.title}>Fotos de{'\n'}progreso</GradientText>
          <SystemText dim style={{ fontSize: 14, lineHeight: 22 }}>
            Documenta tu transformación. Las fotos se guardan de forma privada.
          </SystemText>
        </Animated.View>

        <SystemButton title="📷  Tomar nueva foto" variant="gradient" onPress={pickPhoto} />

        {/* Formulario para foto nueva */}
        {showForm && selectedUri && (
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <SystemPanel style={{ gap: spacing.md }}>
              <Image source={{ uri: selectedUri }} style={styles.preview} />
              <SystemInput
                placeholder="Nota (opcional, ej: 3 meses de entrenamiento)"
                value={note}
                onChangeText={setNote}
              />
              <SystemButton title={uploading ? 'Subiendo…' : 'Guardar foto'} variant="gradient" loading={uploading} onPress={handleSave} />
              <SystemButton title="Cancelar" variant="ghost" onPress={() => { setShowForm(false); setSelectedUri(null); setSelectedBase64(null); }} />
            </SystemPanel>
          </Animated.View>
        )}

        {/* Galería */}
        {(photos.data?.length ?? 0) > 0 ? (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <SystemText style={styles.sectionLabel}>{photos.data!.length} fotos guardadas</SystemText>
            <FlatList
              data={photos.data}
              keyExtractor={(p) => p.id}
              numColumns={2}
              columnWrapperStyle={{ gap: spacing.sm }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.gridItem}
                  onLongPress={() => handleDelete(item)}
                >
                  <Image source={{ uri: getPublicUrl(item.storage_path) }} style={styles.gridImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(7,8,11,0.85)']}
                    style={styles.gridOverlay}
                  >
                    <Text style={styles.gridDate}>
                      {new Date(item.taken_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </Text>
                    {item.weight_kg && (
                      <Text style={styles.gridWeight}>{item.weight_kg} kg</Text>
                    )}
                    {item.note ? (
                      <Text style={styles.gridNote} numberOfLines={1}>{item.note}</Text>
                    ) : null}
                  </LinearGradient>
                </Pressable>
              )}
            />
            <SystemText dim style={{ fontSize: 11, textAlign: 'center', marginTop: spacing.sm }}>
              Mantén presionado para eliminar una foto
            </SystemText>
          </Animated.View>
        ) : (
          <SystemPanel style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.md }}>📸</Text>
            <SystemText dim style={{ textAlign: 'center' }}>
              Aún no tienes fotos de progreso.{'\n'}Toma tu primera foto hoy.
            </SystemText>
          </SystemPanel>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, paddingBottom: 80 },
  header: { gap: spacing.sm },
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint, marginBottom: spacing.sm },
  preview: { width: '100%', height: 280, borderRadius: radius.lg },
  gridItem: { flex: 1, borderRadius: radius.md, overflow: 'hidden', aspectRatio: 0.75 },
  gridImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.sm },
  gridDate:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  gridWeight: { color: gradients.brand[0], fontSize: 11, fontWeight: '800' },
  gridNote:   { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
});
