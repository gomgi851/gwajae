import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { fetchAssignments } from '../../lib/assignments'
import { fetchExams } from '../../lib/exams'
import { fetchSchedules } from '../../lib/schedules'
import { ensureDefaultSubject, fetchSubjects } from '../../lib/subjects'
import { fetchStorageUsageSummary } from '../../lib/storageUsage'
import { EMPTY_STORAGE_SUMMARY, UserWorkspaceContext, type UserWorkspaceContextValue } from './UserWorkspaceContext'

export function UserWorkspaceProvider({ children }: PropsWithChildren) {
  const [assignments, setAssignments] = useState<UserWorkspaceContextValue['assignments']>([])
  const [exams, setExams] = useState<UserWorkspaceContextValue['exams']>([])
  const [schedules, setSchedules] = useState<UserWorkspaceContextValue['schedules']>([])
  const [subjects, setSubjects] = useState<UserWorkspaceContextValue['subjects']>([])
  const [storageSummary, setStorageSummary] = useState(EMPTY_STORAGE_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)

  const loadWorkspaceData = useCallback(async () => {
    const { error: defaultError } = await ensureDefaultSubject()
    if (defaultError) {
      return {
        assignments: [] as UserWorkspaceContextValue['assignments'],
        exams: [] as UserWorkspaceContextValue['exams'],
        schedules: [] as UserWorkspaceContextValue['schedules'],
        subjects: [] as UserWorkspaceContextValue['subjects'],
        storageSummary: EMPTY_STORAGE_SUMMARY,
        dataError: defaultError.message,
        storageError: null,
      }
    }

    const [
      { data: nextSubjects, error: subjectError },
      { data: nextAssignments, error: assignmentError },
      { data: nextExams, error: examError },
      { data: nextSchedules, error: scheduleError },
      { data: nextStorageSummary, error: nextStorageError },
    ] = await Promise.all([
      fetchSubjects(),
      fetchAssignments(),
      fetchExams(),
      fetchSchedules(),
      fetchStorageUsageSummary(),
    ])

    return {
      assignments: nextAssignments ?? [],
      exams: nextExams ?? [],
      schedules: nextSchedules ?? [],
      subjects: nextSubjects ?? [],
      storageSummary: nextStorageSummary,
      dataError:
        subjectError?.message ??
        assignmentError?.message ??
        examError?.message ??
        scheduleError?.message ??
        null,
      storageError: nextStorageError?.message ?? null,
    }
  }, [])

  const refreshAll = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true)
    }

    const nextState = await loadWorkspaceData()
    setAssignments(nextState.assignments)
    setExams(nextState.exams)
    setSchedules(nextState.schedules)
    setSubjects(nextState.subjects)
    setStorageSummary(nextState.storageSummary)
    setDataError(nextState.dataError)
    setStorageError(nextState.storageError)
    setIsLoading(false)
  }, [loadWorkspaceData])

  useEffect(() => {
    let ignore = false

    async function bootstrap() {
      const nextState = await loadWorkspaceData()

      if (ignore) {
        return
      }

      setAssignments(nextState.assignments)
      setExams(nextState.exams)
      setSchedules(nextState.schedules)
      setSubjects(nextState.subjects)
      setStorageSummary(nextState.storageSummary)
      setDataError(nextState.dataError)
      setStorageError(nextState.storageError)
      setIsLoading(false)
    }

    void bootstrap()

    return () => {
      ignore = true
    }
  }, [loadWorkspaceData])

  const value = useMemo<UserWorkspaceContextValue>(
    () => ({
      assignments,
      exams,
      schedules,
      subjects,
      storageSummary,
      isLoading,
      dataError,
      storageError,
      refreshAll,
    }),
    [
      assignments,
      exams,
      schedules,
      dataError,
      isLoading,
      refreshAll,
      storageError,
      storageSummary,
      subjects,
    ],
  )

  return <UserWorkspaceContext.Provider value={value}>{children}</UserWorkspaceContext.Provider>
}
