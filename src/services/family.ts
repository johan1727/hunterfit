import { supabase } from '../lib/supabase';

export type FamilyMember = { user_id: string; joined_at: string; username: string | null };

/** Crea (o reusa) el grupo familiar del dueño y emite un código de invitación. */
export async function createFamilyInvite(): Promise<{ code?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_family_invite');
  if (error) return { error: error.message };
  return { code: data as string };
}

/** Canjea un código: une al usuario al grupo y le otorga premium. */
export async function redeemFamilyInvite(code: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('redeem_family_invite', { invite_code: code.trim() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Miembros del grupo familiar del usuario (si pertenece a alguno). */
export async function getFamilyMembers(userId: string): Promise<FamilyMember[]> {
  // Grupo del que el usuario es dueño o miembro
  const { data: membership } = await supabase
    .from('family_members')
    .select('group_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!membership) return [];
  const { data, error } = await supabase
    .from('family_members')
    .select('user_id, joined_at, profiles(username)')
    .eq('group_id', membership.group_id)
    .order('joined_at');
  if (error) return [];
  return (data ?? []).map((m: any) => ({
    user_id: m.user_id,
    joined_at: m.joined_at,
    username: m.profiles?.username ?? null,
  }));
}
