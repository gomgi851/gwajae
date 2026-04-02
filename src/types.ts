export type Role = 'admin' | 'member'

export interface Subject {
  id: string
  name: string
  color: string
}

export interface Assignment {
  id: string
  subjectId: string
  title: string
  dueDate: string
  submitted: boolean
  isFavorite: boolean
  linkLabel?: string
  attachmentCount: number
  detail?: string
}

export interface AllowedUser {
  id: string
  email: string
  role: Role
  active: boolean
  created_at?: string
}

export interface UsageStat {
  label: string
  used: number
  total: number
}

export interface StorageUsageSummary {
  personalBytes: number
  totalBytes: number
  personalLimitBytes: number
  totalLimitBytes: number
}
