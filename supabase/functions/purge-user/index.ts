import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPER_ADMIN_EMAIL = 'yoonggee95@gmail.com'
const ASSIGNMENT_BUCKET = 'assignment-assets'

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = request.headers.get('Authorization')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Supabase environment variables are missing.' })
  }

  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing authorization header.' })
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const {
    data: { user: requester },
    error: requesterError,
  } = await userClient.auth.getUser()

  if (requesterError || !requester?.email) {
    return jsonResponse(401, { error: 'Unable to verify the current user.' })
  }

  const requesterEmail = requester.email.toLowerCase()

  if (requesterEmail !== SUPER_ADMIN_EMAIL) {
    return jsonResponse(403, { error: 'Only the super admin can permanently delete users.' })
  }

  const body = await request.json().catch(() => null)
  const allowedUserId = typeof body?.allowedUserId === 'string' ? body.allowedUserId : ''

  if (!allowedUserId) {
    return jsonResponse(400, { error: 'allowedUserId is required.' })
  }

  const { data: targetAllowedUser, error: targetError } = await serviceClient
    .from('allowed_users')
    .select('id,email,auth_user_id')
    .eq('id', allowedUserId)
    .maybeSingle()

  if (targetError) {
    return jsonResponse(400, { error: targetError.message })
  }

  if (!targetAllowedUser?.email) {
    return jsonResponse(404, { error: 'Allowed user not found.' })
  }

  const targetEmail = String(targetAllowedUser.email).toLowerCase()

  if (targetEmail === requesterEmail) {
    return jsonResponse(400, { error: 'You cannot delete the current super admin account.' })
  }

  let targetAuthUserId = typeof targetAllowedUser.auth_user_id === 'string' ? targetAllowedUser.auth_user_id : null

  if (!targetAuthUserId) {
    const { data: authUsersData, error: listUsersError } = await serviceClient.auth.admin.listUsers()

    if (listUsersError) {
      return jsonResponse(400, { error: listUsersError.message })
    }

    const matchedUser = authUsersData.users.find(
      (candidate) => candidate.email?.toLowerCase() === targetEmail,
    )

    targetAuthUserId = matchedUser?.id ?? null
  }

  if (targetAuthUserId) {
    const { data: assetRows, error: assetError } = await serviceClient
      .from('assignment_assets')
      .select('storage_path')
      .eq('owner_user_id', targetAuthUserId)

    if (assetError) {
      return jsonResponse(400, { error: assetError.message })
    }

    const storagePaths = (assetRows ?? [])
      .map((row) => String(row.storage_path ?? ''))
      .filter(Boolean)

    for (let index = 0; index < storagePaths.length; index += 100) {
      const batch = storagePaths.slice(index, index + 100)
      const { error: removeError } = await serviceClient.storage.from(ASSIGNMENT_BUCKET).remove(batch)

      if (removeError) {
        return jsonResponse(400, { error: removeError.message })
      }
    }

    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(targetAuthUserId)

    if (deleteUserError) {
      return jsonResponse(400, { error: deleteUserError.message })
    }
  }

  const { error: deleteAllowedUserError } = await serviceClient
    .from('allowed_users')
    .delete()
    .eq('id', allowedUserId)

  if (deleteAllowedUserError) {
    return jsonResponse(400, { error: deleteAllowedUserError.message })
  }

  return jsonResponse(200, {
    success: true,
    deletedEmail: targetEmail,
  })
})
