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

async function normalizeFunctionInvokeError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: '알 수 없는 오류가 발생했습니다.' }
  }

  const defaultMessage =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : '알 수 없는 오류가 발생했습니다.'

  const maybeContext =
    'context' in error && error.context && typeof error.context === 'object' ? error.context : null

  if (!maybeContext || typeof (maybeContext as Response).json !== 'function') {
    return { message: defaultMessage }
  }

  try {
    const response = maybeContext as Response
    const payload = (await response.json()) as { error?: string; message?: string }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return { message: payload.error }
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return { message: payload.message }
    }
  } catch {
    // Fall back to the SDK error message when the response body isn't JSON.
  }

  return { message: defaultMessage }
}

export async function deleteAllowedUser(id: string) {
  if (!supabase) {
    return { error: null }
  }

  const { data, error } = await supabase.functions.invoke('purge-user', {
    body: {
      allowedUserId: id,
    },
  })

  if (error) {
    return {
      data: null,
      error: await normalizeFunctionInvokeError(error),
    }
  }

  return { data, error: null }
}
