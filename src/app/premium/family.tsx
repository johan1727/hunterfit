import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useData';
import {
  createFamilyInvite, redeemFamilyInvite, getFamilyMembers,
  leaveFamily, removeFamilyMember, cancelFamilyPlan, type FamilyMember,
} from '../../services/family';
import { characterImage, CHARS_WITH_ART } from '../../constants/game';
import {
  AuroraBackground, GradientText, SystemPanel, SystemWindowPanel, SystemText, SystemButton, SystemInput,
} from '../../components/system';
import { colors, numeric, radius, spacing } from '../../theme/system';

export default function FamilyScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const { data: profile } = useProfile(userId);
  const isFamilyOwner = !!profile?.plan_id?.startsWith('family_') && profile?.plan_source !== 'family_invite';

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  function reload() { if (userId) getFamilyMembers(userId).then(setMembers); }

  useEffect(() => {
    reload();
  }, [userId, profile?.plan_source]);

  async function handleLeave() {
    Alert.alert('Salir del grupo', '¿Seguro? Perderás el acceso Premium del plan Familiar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          const { success, error } = await leaveFamily();
          if (!success) { Alert.alert('Error', error ?? 'No se pudo salir'); return; }
          Alert.alert('Listo', 'Saliste del grupo Familiar.', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
          ]);
        },
      },
    ]);
  }

  function handleCancelPlan() {
    Alert.alert('Cancelar plan Familiar', '¿Disolver el grupo? Los miembros invitados perderán su Premium.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Disolver grupo', style: 'destructive', onPress: async () => {
          const { success, error } = await cancelFamilyPlan();
          if (!success) { Alert.alert('Error', error ?? 'No se pudo cancelar'); return; }
          Alert.alert('Listo', 'El grupo Familiar fue disuelto.', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/home') },
          ]);
        },
      },
    ]);
  }

  function handleRemove(target: FamilyMember) {
    Alert.alert('Quitar miembro', `¿Quitar a ${target.username || 'este cazador'} del grupo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: async () => {
          const { success, error } = await removeFamilyMember(target.user_id);
          if (!success) { Alert.alert('Error', error ?? 'No se pudo quitar'); return; }
          reload();
        },
      },
    ]);
  }

  async function handleGenerate() {
    setGenerating(true);
    const { code: c, error } = await createFamilyInvite();
    setGenerating(false);
    if (error) { Alert.alert('No se pudo generar', error); return; }
    setCode(c ?? null);
    if (userId) getFamilyMembers(userId).then(setMembers);
  }

  async function handleShare() {
    if (!code) return;
    await Share.share({ message: `Únete a mi plan Familiar en HunterFit con este código: ${code}` });
  }

  async function handleRedeem() {
    if (redeemCode.trim().length < 4) return;
    setRedeeming(true);
    const { success, error } = await redeemFamilyInvite(redeemCode);
    setRedeeming(false);
    if (!success) { Alert.alert('Código inválido', error ?? 'No se pudo canjear'); return; }
    Alert.alert('¡Listo!', 'Te uniste al plan Familiar. Premium activado.', [
      { text: 'Continuar', onPress: () => router.replace('/(tabs)/home') },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color={colors.textDim} />
          </Pressable>
          <View style={styles.badge}>
            <Ionicons name="people" size={13} color={colors.glow} />
            <SystemText style={{ fontSize: 12, fontWeight: '900', color: colors.glow }}>FAMILIAR</SystemText>
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <GradientText style={{ fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 34 }}>
            Plan Familiar
          </GradientText>
          <SystemText dim style={{ fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
            Comparte Premium con hasta 6 personas. Cada miembro tiene su propio progreso.
          </SystemText>
        </View>

        {/* Dueño: invitar */}
        {isFamilyOwner && (
          <SystemWindowPanel style={{ gap: spacing.md }}>
            <SystemText style={{ fontWeight: '800', fontSize: 16 }}>Invitar a tu familia</SystemText>
            {code ? (
              <View style={{ gap: spacing.sm }}>
                <View style={styles.codeBox}>
                  <SystemText style={[styles.codeText, numeric]}>{code}</SystemText>
                </View>
                <SystemButton title="Compartir código" variant="gradient" onPress={handleShare} />
                <SystemText dim style={{ fontSize: 12, textAlign: 'center' }}>
                  El código expira en 7 días y sirve para un miembro.
                </SystemText>
              </View>
            ) : (
              <SystemButton
                title={generating ? 'Generando…' : 'Generar código de invitación'}
                variant="gradient"
                loading={generating}
                onPress={handleGenerate}
              />
            )}
          </SystemWindowPanel>
        )}

        {/* Miembros */}
        {members.length > 0 && (
          <SystemPanel style={{ gap: spacing.sm }}>
            <SystemText style={styles.sectionLabel}>Miembros ({members.length}/6)</SystemText>
            {members.map((m) => (
              <View key={m.user_id} style={styles.memberRow}>
                {m.character_slug && CHARS_WITH_ART.has(m.character_slug) ? (
                  <Image source={characterImage(m.character_slug, 'E')} style={styles.memberAvatar} resizeMode="cover" />
                ) : (
                  <Ionicons name="person-circle-outline" size={32} color={colors.glow} />
                )}
                <SystemText style={{ flex: 1, fontSize: 14 }}>
                  {m.user_id === userId ? 'Tú' : (m.username || 'Cazador')}
                </SystemText>
                {m.is_owner ? (
                  <SystemText dim style={{ fontSize: 11 }}>Dueño</SystemText>
                ) : isFamilyOwner && m.user_id !== userId ? (
                  <Pressable onPress={() => handleRemove(m)} hitSlop={8} style={styles.removeBtn}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </SystemPanel>
        )}

        {/* Miembro (no dueño): salir del grupo */}
        {!isFamilyOwner && members.some((m) => m.user_id === userId) && (
          <Pressable onPress={handleLeave} style={styles.leaveBtn}>
            <Ionicons name="exit-outline" size={16} color={colors.danger} />
            <SystemText style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>Salir del grupo Familiar</SystemText>
          </Pressable>
        )}

        {/* Dueño: cancelar / disolver el plan */}
        {isFamilyOwner && (
          <Pressable onPress={handleCancelPlan} style={styles.leaveBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <SystemText style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>Cancelar plan Familiar</SystemText>
          </Pressable>
        )}

        {/* Cualquiera fuera de un grupo: canjear código */}
        {!isFamilyOwner && !members.some((m) => m.user_id === userId) && (
          <SystemPanel style={{ gap: spacing.sm }}>
            <SystemText style={{ fontWeight: '800', fontSize: 16 }}>¿Tienes un código?</SystemText>
            <SystemText dim style={{ fontSize: 13 }}>
              Ingresa el código que te compartieron para unirte y activar Premium.
            </SystemText>
            <SystemInput
              placeholder="Ej: A1B2C3D4"
              value={redeemCode}
              onChangeText={(t) => setRedeemCode(t.toUpperCase())}
              autoCapitalize="characters"
            />
            <SystemButton
              title={redeeming ? 'Canjeando…' : 'Unirme al plan Familiar'}
              variant="gradient"
              loading={redeeming}
              disabled={redeemCode.trim().length < 4}
              onPress={handleRedeem}
            />
          </SystemPanel>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.glow + '1A', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.glow + '40',
  },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textFaint },
  codeBox: {
    backgroundColor: colors.bgElevated, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.glow + '50',
    paddingVertical: spacing.md, alignItems: 'center',
  },
  codeText: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.danger + '18', borderWidth: 1, borderColor: colors.danger + '40',
  },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.danger + '40', backgroundColor: colors.danger + '0F',
  },
});
