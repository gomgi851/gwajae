import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import type { Assignment } from '../../types'
import { PinIcon } from '../common/ActionIcons'
import { useUserWorkspace } from './useUserWorkspace'
import styles from './HomePage.module.css'

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

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
        {bytesToMegabytes(used)}MB / {bytesToMegabytes(total)}MB 사용 중
      </p>
    </section>
  )
}

function TotalUsageCard({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>전체 저장공간</h2>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${percentage}%` }} aria-hidden="true" />
      </div>
      <p className={styles.usageLabel}>
        전체 {bytesToMegabytes(used)}MB / {Math.round(total / (1024 * 1024 * 1024))}GB 사용 중
      </p>
    </section>
  )
}

function formatDueDetail(dueDate: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dueDate))
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite)
    }

    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
  })
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
          <p className={styles.assignmentDetail}>마감 {formatDueDetail(assignment.dueDate)}</p>
        </div>
      </div>
      {assignment.isFavorite ? (
        <span className={`${styles.star} ${styles.starActive}`} aria-label="고정됨">
          <PinIcon />
        </span>
      ) : (
        <button className={styles.rowButton} aria-label={`${assignment.title} 상태`} />
      )}
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
          <p className={styles.assignmentDetail}>마감 {formatDueDetail(assignment.dueDate)}</p>
        </div>
      </div>
      <span className={`${styles.star} ${styles.starActive}`} aria-label="고정됨">
        <PinIcon />
      </span>
    </li>
  )
}

export function HomePage() {
  const { isAdmin } = useAuth()
  const { assignments, storageSummary, isLoading, dataError, storageError } = useUserWorkspace()

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const favoriteAssignments = useMemo(
    () => sortedAssignments.filter((assignment) => assignment.isFavorite).slice(0, 4),
    [sortedAssignments],
  )
  const upcomingAssignments = useMemo(() => sortedAssignments.slice(0, 3), [sortedAssignments])

  return (
    <div className={styles.grid}>
      <div className={styles.leftColumn}>
        <UsageCard used={storageSummary.personalBytes} total={storageSummary.personalLimitBytes} />
        {isAdmin ? (
          <TotalUsageCard used={storageSummary.totalBytes} total={storageSummary.totalLimitBytes} />
        ) : null}
        {storageError ? (
          <p className={styles.helperText}>
            저장공간 수치는 첨부파일 메타데이터 기준으로 계산됩니다. 최신 SQL과 업로드 데이터가 반영되어야 정확합니다.
          </p>
        ) : null}
      </div>

      <section className={`${styles.panel} ${styles.tallPanel}`}>
        <h1 className={styles.panelTitle}>다가오는 마감</h1>
        {isLoading ? <p className={styles.helperText}>과제 데이터를 불러오는 중입니다...</p> : null}
        {dataError ? <p className={styles.helperText}>{dataError}</p> : null}
        {!isLoading && !dataError ? (
          <ul className={styles.list}>
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <DeadlineRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <li className={styles.listRow}>
                <p className={styles.assignmentDetail}>
                  아직 등록한 과제가 없습니다. 과제 관리 탭에서 첫 과제를 추가해 보세요.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>

      <section className={`${styles.panel} ${styles.bottomPanel}`}>
        <h1 className={styles.panelTitle}>고정한 과제</h1>
        {!isLoading && !dataError ? (
          <ul className={styles.list}>
            {favoriteAssignments.length > 0 ? (
              favoriteAssignments.map((assignment) => (
                <FavoriteRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <li className={styles.listRow}>
                <p className={styles.assignmentDetail}>
                  핀 버튼을 누른 과제는 여기서 빠르게 다시 볼 수 있습니다.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
