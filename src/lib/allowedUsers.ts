import type { AllowedUser, Role } from '../types'
import { supabase } from './supabase'

export async function fetchAllowedUserByEmail(email: string) {
  if (!supabase) {
    return { data: null, error: null }
  }

  return supabase
    .from('allowed_users')
    .select('id,email,role,active,created_at')
    .eq('email', email.toLowerCase())
    .maybeSingle<AllowedUser>()
}

export async function fetchAllowedUsers() {
  if (!supabase) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase.rpc('get_admin_allowed_users_with_usage')

  if (error) {
    return supabase
      .from('allowed_users')
      .select('id,email,role,active,created_at')
      .order('created_at', { ascending: true })
  }

  return {
    data: (data ?? []) as AllowedUser[],
    error: null,
  }
}

export async function syncAllowedUserAuth(email: string, authUserId: string, role: Role = 'member') {
  if (!supabase) {
    return { data: null, error: null }
  }

  return supabase.rpc('sync_allowed_user_auth', {
    p_email: email.toLowerCase(),
    p_auth_user_id: authUserId,
    p_default_role: role,
  })
}

export async function inviteAllowedUser(email: string, role: Role = 'member') {
  if (!supabase) {
    return { data: null, error: null }
  }

  return supabase
    .from('allowed_users')
    .insert({
      email: email.toLowerCase(),
      role,
      active: true,
    })
    .select('id,email,role,active,created_at')
    .single<AllowedUser>()
}

export async function updateAllowedUser(
  id: string,
  updates: Partial<Pick<AllowedUser, 'role' | 'active'>>,
) {
  if (!supabase) {
    return { data: null, error: null }
  }

  return supabase
    .from('allowed_users')
    .update(updates)
    .eq('id', id)
    .select('id,email,role,active,created_at')
    .single<AllowedUser>()
}

export async function deleteAllowedUser(id: string) {
  if (!supabase) {
    return { error: null }
  }

  return supabase.from('allowed_users').delete().eq('id', id)
}
