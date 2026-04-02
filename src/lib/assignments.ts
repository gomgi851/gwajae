import type { AssetType, Assignment, AssignmentAsset } from '../types'
import { supabase } from './supabase'

const ASSIGNMENT_BUCKET = 'assignment-assets'

interface CreateAssignmentInput {
  subjectId: string
  title: string
  dueDate: string
  submitted: boolean
  description: string
  externalLink: string
  imageFiles: File[]
  attachmentFiles: File[]
}

interface SubjectRow {
  id: string
  name: string
  color: string
  is_default?: boolean
}

interface AssetRow {
  id: string
  assignment_id: string | null
  storage_path: string
  file_name: string
  asset_type: AssetType
  size_bytes: number
  is_thumbnail: boolean
  created_at: string
}

interface AssignmentRow {
  id: string
  subject_id: string
  title: string
  due_date: string
  submitted: boolean
  is_favorite: boolean
  description: string | null
  external_link: string | null
  subject?: SubjectRow | SubjectRow[] | null
  assets?: AssetRow[]
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function mapAsset(row: AssetRow): AssignmentAsset {
  return {
    id: row.id,
    assignmentId: String(row.assignment_id ?? ''),
    storagePath: row.storage_path,
    fileName: row.file_name,
    assetType: row.asset_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    isThumbnail: Boolean(row.is_thumbnail),
    createdAt: row.created_at,
  }
}

function mapAssignment(row: AssignmentRow): Assignment {
  const subject = Array.isArray(row.subject) ? row.subject[0] : row.subject
  const assets = (row.assets ?? []).map((asset) => mapAsset(asset))

  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    dueDate: row.due_date,
    submitted: Boolean(row.submitted),
    isFavorite: Boolean(row.is_favorite),
    description: row.description ?? '',
    externalLink: row.external_link,
    attachmentCount: assets.length,
    subjectName: subject?.name ?? 'Unknown',
    subjectColor: subject?.color ?? '#d7dee7',
    assets,
  }
}

async function getCurrentUser() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function fetchAssignments() {
  if (!supabase) {
    return { data: [] as Assignment[], error: null }
  }

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id,
      subject_id,
      title,
      due_date,
      submitted,
      is_favorite,
      description,
      external_link,
      subject:subjects(id,name,color,is_default),
      assets:assignment_assets(
        id,
        assignment_id,
        storage_path,
        file_name,
        asset_type,
        size_bytes,
        is_thumbnail,
        created_at
      )
    `)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [] as Assignment[], error }
  }

  return {
    data: (data ?? []).map((row) => mapAssignment(row as unknown as AssignmentRow)),
    error: null,
  }
}

export async function createAssignmentWithAssets(input: CreateAssignmentInput) {
  if (!supabase) {
    return { data: null as Assignment | null, error: null }
  }

  const user = await getCurrentUser()
  if (!user) {
    return {
      data: null as Assignment | null,
      error: new Error('You must be signed in to create an assignment.'),
    }
  }

  const title = input.title.trim()
  if (!title) {
    return {
      data: null as Assignment | null,
      error: new Error('Assignment title is required.'),
    }
  }

  const { data: insertedAssignment, error: insertError } = await supabase
    .from('assignments')
    .insert({
      owner_user_id: user.id,
      subject_id: input.subjectId,
      title,
      due_date: input.dueDate,
      submitted: input.submitted,
      is_favorite: false,
      description: input.description.trim() || null,
      external_link: input.externalLink.trim() || null,
    })
    .select('id')
    .single()

  if (insertError) {
    return { data: null as Assignment | null, error: insertError }
  }

  const assignmentId = insertedAssignment.id as string
  const filesToUpload = [
    ...input.imageFiles.map((file, index) => ({
      file,
      assetType: 'image' as const,
      isThumbnail: index === 0,
    })),
    ...input.attachmentFiles.map((file) => ({
      file,
      assetType: 'file' as const,
      isThumbnail: false,
    })),
  ]

  const uploadedRows: Array<Record<string, unknown>> = []

  for (const entry of filesToUpload) {
    const storagePath = `${user.id}/${assignmentId}/${crypto.randomUUID()}-${sanitizeFileName(entry.file.name)}`

    const { error: uploadError } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .upload(storagePath, entry.file, {
        upsert: false,
        contentType: entry.file.type || undefined,
      })

    if (uploadError) {
      return { data: null as Assignment | null, error: uploadError }
    }

    uploadedRows.push({
      assignment_id: assignmentId,
      owner_user_id: user.id,
      storage_path: storagePath,
      file_name: entry.file.name,
      asset_type: entry.assetType,
      size_bytes: entry.file.size,
      is_thumbnail: entry.isThumbnail,
    })
  }

  if (uploadedRows.length > 0) {
    const { error: assetError } = await supabase.from('assignment_assets').insert(uploadedRows)
    if (assetError) {
      return { data: null as Assignment | null, error: assetError }
    }
  }

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id,
      subject_id,
      title,
      due_date,
      submitted,
      is_favorite,
      description,
      external_link,
      subject:subjects(id,name,color,is_default),
      assets:assignment_assets(
        id,
        assignment_id,
        storage_path,
        file_name,
        asset_type,
        size_bytes,
        is_thumbnail,
        created_at
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (error) {
    return { data: null as Assignment | null, error }
  }

  return { data: mapAssignment(data as unknown as AssignmentRow), error: null }
}

export async function updateAssignment(
  assignmentId: string,
  updates: Partial<Pick<Assignment, 'submitted' | 'isFavorite'>>,
) {
  if (!supabase) {
    return { data: null as Assignment | null, error: null }
  }

  const payload: Record<string, unknown> = {}

  if (typeof updates.submitted === 'boolean') {
    payload.submitted = updates.submitted
  }

  if (typeof updates.isFavorite === 'boolean') {
    payload.is_favorite = updates.isFavorite
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(payload)
    .eq('id', assignmentId)
    .select(`
      id,
      subject_id,
      title,
      due_date,
      submitted,
      is_favorite,
      description,
      external_link,
      subject:subjects(id,name,color,is_default),
      assets:assignment_assets(
        id,
        assignment_id,
        storage_path,
        file_name,
        asset_type,
        size_bytes,
        is_thumbnail,
        created_at
      )
    `)
    .single()

  if (error) {
    return { data: null as Assignment | null, error }
  }

  return { data: mapAssignment(data as unknown as AssignmentRow), error: null }
}

export async function deleteAssignment(assignmentId: string) {
  if (!supabase) {
    return { error: null }
  }

  const { data: assets, error: assetError } = await supabase
    .from('assignment_assets')
    .select('storage_path')
    .eq('assignment_id', assignmentId)

  if (assetError) {
    return { error: assetError }
  }

  const storagePaths = (assets ?? [])
    .map((row) => String(row.storage_path ?? ''))
    .filter(Boolean)

  if (storagePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .remove(storagePaths)

    if (removeError) {
      return { error: removeError }
    }
  }

  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
  return { error }
}
