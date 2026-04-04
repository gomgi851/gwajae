import type { ScheduleEvent } from '../types'
import { supabase } from './supabase'

interface ScheduleRow {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  is_all_day: boolean
  is_favorite?: boolean
  location: string | null
  note: string | null
  color: string
  subject_id?: string | null
  subject?: { name: string; color: string } | null
}

export interface ScheduleFormInput {
  title: string
  startsAt: string
  endsAt?: string | null
  isAllDay: boolean
  location?: string
  note?: string
  color?: string
  subjectId?: string | null
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { code?: string; message?: string }
  const message = (maybeError.message ?? '').toLowerCase()

  return (
    maybeError.code === '42P01' ||
    message.includes("could not find the table 'public.schedules' in the schema cache") ||
    message.includes('relation "public.schedules" does not exist')
  )
}

function mapSchedule(row: ScheduleRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isAllDay: Boolean(row.is_all_day),
    isFavorite: Boolean(row.is_favorite),
    location: row.location,
    note: row.note ?? '',
    color: row.color,
    subjectId: row.subject_id ?? undefined,
    subjectName: row.subject?.name,
    subjectColor: row.subject?.color,
  }
}

async function getCurrentUserId() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function fetchSchedules() {
  if (!supabase) {
    return { data: [] as ScheduleEvent[], error: null }
  }

  const { data, error } = await supabase
    .from('schedules')
    .select('id,title,starts_at,ends_at,is_all_day,is_favorite,location,note,color,subject_id,subject:subject_id(name,color)')
    .order('starts_at', { ascending: true })

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [] as ScheduleEvent[], error: null }
    }

    return { data: [] as ScheduleEvent[], error }
  }

  return {
    data: (data ?? []).map((row) => mapSchedule(row as unknown as ScheduleRow)),
    error: null,
  }
}

export async function createSchedule(input: ScheduleFormInput) {
  if (!supabase) {
    return { data: null as ScheduleEvent | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as ScheduleEvent | null,
      error: new Error('일정을 등록하려면 먼저 로그인해 주세요.'),
    }
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      owner_user_id: userId,
      title: input.title.trim(),
      subject_id: input.subjectId || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      is_all_day: input.isAllDay,
      location: input.location?.trim() || null,
      note: input.note?.trim() || null,
      color: input.color || '#9bb4c8',
    })
    .select('id,title,starts_at,ends_at,is_all_day,is_favorite,location,note,color,subject_id,subject:subject_id(name,color)')
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: null as ScheduleEvent | null,
        error: new Error('일정 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
      }
    }

    return { data: null as ScheduleEvent | null, error }
  }

  return { data: mapSchedule(data as unknown as ScheduleRow), error: null }
}

export async function updateSchedule(scheduleId: string, input: ScheduleFormInput) {
  if (!supabase) {
    return { data: null as ScheduleEvent | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as ScheduleEvent | null,
      error: new Error('일정을 수정하려면 먼저 로그인해 주세요.'),
    }
  }

  const { data, error } = await supabase
    .from('schedules')
    .update({
      title: input.title.trim(),
      subject_id: input.subjectId || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      is_all_day: input.isAllDay,
      location: input.location?.trim() || null,
      note: input.note?.trim() || null,
      color: input.color || '#9bb4c8',
    })
    .eq('id', scheduleId)
    .select('id,title,starts_at,ends_at,is_all_day,is_favorite,location,note,color,subject_id,subject:subject_id(name,color)')
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: null as ScheduleEvent | null,
        error: new Error('일정 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
      }
    }

    return { data: null as ScheduleEvent | null, error }
  }

  return { data: mapSchedule(data as unknown as ScheduleRow), error: null }
}

export async function deleteSchedule(scheduleId: string) {
  if (!supabase) {
    return { error: null }
  }

  const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)

  if (error && isMissingTableError(error)) {
    return {
      error: new Error('일정 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
    }
  }

  return { error }
}

export async function toggleScheduleFlags(scheduleId: string, updates: { isFavorite?: boolean }) {
  if (!supabase) {
    return { data: null as ScheduleEvent | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as ScheduleEvent | null,
      error: new Error('일정을 수정하려면 먼저 로그인해 주세요.'),
    }
  }

  const nextPayload: Record<string, unknown> = {}
  if (updates.isFavorite !== undefined) {
    nextPayload.is_favorite = updates.isFavorite
  }

  const { data, error } = await supabase
    .from('schedules')
    .update(nextPayload)
    .eq('id', scheduleId)
    .select('id,title,starts_at,ends_at,is_all_day,is_favorite,location,note,color,subject_id,subject:subject_id(name,color)')
    .single()

  if (error) {
    return { data: null as ScheduleEvent | null, error }
  }

  return { data: mapSchedule(data as unknown as ScheduleRow), error: null }
}
