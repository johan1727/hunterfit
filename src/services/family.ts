import { supabase } from '../lib/supabase';

export type FamilyMember = {
  user_id: string; joined_at: string; username: string | null;
  is_owner?: boolean; character_slug?: string | null;
};

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

/** Miembros del grupo familiar del usuario (vía RPC SECURITY DEFINER). */
export async function getFamilyMembers(_userId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase.rpc('get_family_members');
  if (error) return [];
  return (data ?? []).map((m: any) => ({
    user_id: m.user_id,
    joined_at: m.joined_at,
    username: m.username ?? null,
    is_owner: m.is_owner,
    character_slug: m.character_slug ?? null,
  }));
}

/** Salir del grupo familiar (miembro no-dueño). Pierde el premium del plan. */
export async function leaveFamily(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('leave_family');
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Quitar a un miembro del grupo (solo dueño). */
export async function removeFamilyMember(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('remove_family_member', { target: targetUserId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
