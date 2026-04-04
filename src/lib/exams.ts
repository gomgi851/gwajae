import type { Exam } from '../types'
import { supabase } from './supabase'

interface SubjectRow {
  id: string
  name: string
  color: string
}

interface ExamRow {
  id: string
  subject_id: string
  title: string
  exam_at: string
  is_favorite?: boolean
  description: string | null
  subject?: SubjectRow | SubjectRow[] | null
}

export interface ExamFormInput {
  subjectId: string
  title: string
  examAt: string
  description?: string
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { code?: string; message?: string }
  const message = (maybeError.message ?? '').toLowerCase()

  return (
    maybeError.code === '42P01' ||
    message.includes("could not find the table 'public.exams' in the schema cache") ||
    message.includes('relation "public.exams" does not exist')
  )
}

function mapExam(row: ExamRow): Exam {
  const subject = Array.isArray(row.subject) ? row.subject[0] : row.subject

  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    examAt: row.exam_at,
    isFavorite: Boolean(row.is_favorite),
    description: row.description ?? '',
    subjectName: subject?.name ?? '미지정',
    subjectColor: subject?.color ?? '#d7dee7',
  }
}

async function getCurrentUserId() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function fetchExams() {
  if (!supabase) {
    return { data: [] as Exam[], error: null }
  }

  const { data, error } = await supabase
    .from('exams')
    .select(`
      id,
      subject_id,
      title,
      exam_at,
      is_favorite,
      description,
      subject:subjects(id,name,color)
    `)
    .order('exam_at', { ascending: true })

  if (error) {
    if (isMissingTableError(error)) {
      return { data: [] as Exam[], error: null }
    }

    return { data: [] as Exam[], error }
  }

  return {
    data: (data ?? []).map((row) => mapExam(row as unknown as ExamRow)),
    error: null,
  }
}

export async function createExam(input: ExamFormInput) {
  if (!supabase) {
    return { data: null as Exam | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as Exam | null,
      error: new Error('시험을 등록하려면 먼저 로그인해 주세요.'),
    }
  }

  const { data, error } = await supabase
    .from('exams')
    .insert({
      owner_user_id: userId,
      subject_id: input.subjectId,
      title: input.title.trim(),
      exam_at: input.examAt,
      description: input.description?.trim() || null,
    })
    .select(`
      id,
      subject_id,
      title,
      exam_at,
      is_favorite,
      description,
      subject:subjects(id,name,color)
    `)
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: null as Exam | null,
        error: new Error('시험 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
      }
    }

    return { data: null as Exam | null, error }
  }

  return { data: mapExam(data as unknown as ExamRow), error: null }
}

export async function updateExam(examId: string, input: ExamFormInput) {
  if (!supabase) {
    return { data: null as Exam | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as Exam | null,
      error: new Error('시험을 수정하려면 먼저 로그인해 주세요.'),
    }
  }

  const { data, error } = await supabase
    .from('exams')
    .update({
      subject_id: input.subjectId,
      title: input.title.trim(),
      exam_at: input.examAt,
      description: input.description?.trim() || null,
    })
    .eq('id', examId)
    .select(`
      id,
      subject_id,
      title,
      exam_at,
      is_favorite,
      description,
      subject:subjects(id,name,color)
    `)
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      return {
        data: null as Exam | null,
        error: new Error('시험 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
      }
    }

    return { data: null as Exam | null, error }
  }

  return { data: mapExam(data as unknown as ExamRow), error: null }
}

export async function deleteExam(examId: string) {
  if (!supabase) {
    return { error: null }
  }

  const { error } = await supabase.from('exams').delete().eq('id', examId)

  if (error && isMissingTableError(error)) {
    return {
      error: new Error('시험 테이블이 아직 적용되지 않았습니다. Supabase SQL을 다시 실행해 주세요.'),
    }
  }

  return { error }
}

export async function toggleExamFlags(examId: string, updates: { isFavorite?: boolean }) {
  if (!supabase) {
    return { data: null as Exam | null, error: null }
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      data: null as Exam | null,
      error: new Error('시험을 수정하려면 먼저 로그인해 주세요.'),
    }
  }

  const nextPayload: Record<string, unknown> = {}
  if (updates.isFavorite !== undefined) {
    nextPayload.is_favorite = updates.isFavorite
  }

  const { data, error } = await supabase
    .from('exams')
    .update(nextPayload)
    .eq('id', examId)
    .select(`
      id,
      subject_id,
      title,
      exam_at,
      is_favorite,
      description,
      subject:subjects(id,name,color)
    `)
    .single()

  if (error) {
    return { data: null as Exam | null, error }
  }

  return { data: mapExam(data as unknown as ExamRow), error: null }
}
