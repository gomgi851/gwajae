import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { fetchAssignments } from '../../lib/assignments'
import { useStorageUsage } from '../../hooks/useStorageUsage'
import type { Assignment } from '../../types'
import styles from './HomePage.module.css'

function UsageCard({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>내 저장공간</h2>
      <div
        className={styles.progressRing}
        style={
          {
            '--progress-angle': `${percentage * 3.6}deg`,
          } as CSSProperties
        }
      >
        <div className={styles.progressInner}>
          <strong>{percentage}%</strong>
          <span>사용 중</span>
        </div>
      </div>
      <p className={styles.usageLabel}>
        {used}MB / {total}MB 사용 중
      </p>
    </section>
  )
}

function TotalUsageCard({ used, totalMb }: { used: number; totalMb: number }) {
  const percentage = totalMb > 0 ? Math.min(100, Math.round((used / totalMb) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>전체 저장공간</h2>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${percentage}%` }} aria-hidden="true" />
      </div>
      <p className={styles.usageLabel}>
        전체 {used}MB / {totalMb / 1024}GB 사용 중
      </p>
    </section>
  )
}

function formatDueDetail(dueDate: string) {
  const date = new Date(dueDate)
  const label = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)

  return `마감 ${label}`
}

function DeadlineRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className={styles.listRow}>
      <div className={styles.rowMeta}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
        >
          {assignment.subjectName ?? '미지정'}
        </span>
        <div>
          <p className={styles.assignmentName}>{assignment.title}</p>
          <p className={styles.assignmentDetail}>{formatDueDetail(assignment.dueDate)}</p>
        </div>
      </div>
      <button className={styles.rowButton} aria-label={`${assignment.title} 상태`} />
    </li>
  )
}

function FavoriteRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className={styles.listRow}>
      <div className={styles.rowMeta}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
        >
          {assignment.subjectName ?? '미지정'}
        </span>
        <div>
          <p className={styles.assignmentName}>{assignment.title}</p>
          <p className={styles.assignmentDetail}>{formatDueDetail(assignment.dueDate)}</p>
        </div>
      </div>
      <button className={`${styles.star} ${styles.starActive}`} aria-label="즐겨찾기됨">
        *
      </button>
    </li>
  )
}

export function HomePage() {
  const { isAdmin } = useAuth()
  const { personalUsedMb, personalLimitMb, totalUsedMb, totalLimitMb, error: storageError } =
    useStorageUsage()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadAssignments() {
      setIsLoading(true)
      const { data, error: queryError } = await fetchAssignments()

      if (ignore) {
        return
      }

      setAssignments(data ?? [])
      setError(queryError ? queryError.message : null)
      setIsLoading(false)
    }

    void loadAssignments()

    return () => {
      ignore = true
    }
  }, [])

  const favoriteAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.isFavorite).slice(0, 4),
    [assignments],
  )
  const upcomingAssignments = useMemo(() => assignments.slice(0, 3), [assignments])

  return (
    <div className={styles.grid}>
      <div className={styles.leftColumn}>
        <UsageCard used={personalUsedMb} total={personalLimitMb} />
        {isAdmin ? <TotalUsageCard used={totalUsedMb} totalMb={totalLimitMb} /> : null}
        {storageError ? (
          <p className={styles.helperText}>
            저장공간 수치는 최신 SQL 설정 이후 업로드된 과제 파일 기준으로 계산됩니다.
          </p>
        ) : null}
      </div>

      <section className={`${styles.panel} ${styles.tallPanel}`}>
        <h1 className={styles.panelTitle}>다가오는 마감</h1>
        {isLoading ? <p className={styles.helperText}>과제를 불러오는 중입니다...</p> : null}
        {error ? <p className={styles.helperText}>{error}</p> : null}
        {!isLoading && !error ? (
          <ul className={styles.list}>
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <DeadlineRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <li className={styles.listRow}>
                <p className={styles.assignmentDetail}>
                  아직 등록된 과제가 없습니다. 과제 관리 탭에서 첫 과제를 추가해 보세요.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>

      <section className={`${styles.panel} ${styles.bottomPanel}`}>
        <h1 className={styles.panelTitle}>즐겨찾기</h1>
        {!isLoading && !error ? (
          <ul className={styles.list}>
            {favoriteAssignments.length > 0 ? (
              favoriteAssignments.map((assignment) => (
                <FavoriteRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <li className={styles.listRow}>
                <p className={styles.assignmentDetail}>
                  과제를 즐겨찾기하면 이곳에 빠르게 모아볼 수 있습니다.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
