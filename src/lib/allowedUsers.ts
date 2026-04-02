import type { AllowedUser, Role } from '../types'
import { supabase } from './supabase'

interface AllowedUserRpcRow {
  id: string
  email: string
  role: Role
  active: boolean
  created_at?: string
  usage_bytes?: number | null
  usage_limit_bytes?: number | null
}

function mapAllowedUserRow(row: AllowedUserRpcRow): AllowedUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    usageBytes: Number(row.usage_bytes ?? 0),
    usageLimitBytes: Number(row.usage_limit_bytes ?? 0),
  }
}

export async function fetchAllowedUserByEmail(email: string) {
  if (!supabase) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('allowed_users')
    .select('id,email,role,active,created_at')
    .eq('email', email.toLowerCase())
    .maybeSingle<AllowedUser>()

  return {
    data: data
      ? {
          ...data,
          usageBytes: 0,
          usageLimitBytes: 100 * 1024 * 1024,
        }
      : null,
    error,
  }
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
    data: ((data ?? []) as AllowedUserRpcRow[]).map(mapAllowedUserRow),
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

  return supabase.rpc('purge_allowed_user', {
    p_allowed_user_id: id,
  })
}
