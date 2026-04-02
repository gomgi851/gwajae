import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { toggleAssignmentFlags } from '../../lib/assignments'
import type { Assignment } from '../../types'
import { PinIcon } from '../common/ActionIcons'
import { useUserWorkspace } from './useUserWorkspace'
import styles from './HomePage.module.css'

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

function getDdayLabel(dueDate: string) {
  const today = new Date()
  const due = new Date(dueDate)

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'D-day'
  }

  if (diffDays > 0) {
    return `D-${diffDays}`
  }

  return `D+${Math.abs(diffDays)}`
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

function UsageCard({
  title,
  used,
  total,
  circular = false,
}: {
  title: string
  used: number
  total: number
  circular?: boolean
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {circular ? (
        <div
          className={styles.progressRing}
          style={{ '--progress-angle': `${percentage * 3.6}deg` } as CSSProperties}
        >
          <div className={styles.progressInner}>
            <strong>{percentage}%</strong>
            <span>사용 중</span>
          </div>
        </div>
      ) : (
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${percentage}%` }} aria-hidden="true" />
        </div>
      )}
      <p className={styles.usageLabel}>
        {circular
          ? `${bytesToMegabytes(used)}MB / ${bytesToMegabytes(total)}MB 사용 중`
          : `전체 ${bytesToMegabytes(used)}MB / ${Math.round(total / (1024 * 1024 * 1024))}GB 사용 중`}
      </p>
    </section>
  )
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite)
    }

    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
  })
}

function SubmittedToggle({
  assignment,
  disabled,
  onToggle,
}: {
  assignment: Assignment
  disabled: boolean
  onToggle: (assignment: Assignment) => Promise<void>
}) {
  return (
    <button
      type="button"
      className={styles.statusButton}
      onClick={() => void onToggle(assignment)}
      disabled={disabled}
      aria-label={assignment.submitted ? '미제출로 변경' : '제출 완료로 변경'}
    >
      <span
        className={
          assignment.submitted ? `${styles.statusCircle} ${styles.statusDone}` : styles.statusCircle
        }
      >
        {assignment.submitted ? '✓' : ''}
      </span>
    </button>
  )
}

function PanelHeader({
  title,
  actionLabel,
}: {
  title: string
  actionLabel: string
}) {
  return (
    <div className={styles.panelHeader}>
      <h1 className={styles.panelTitle}>{title}</h1>
      <div className={styles.columnHeader} aria-hidden="true">
        <span>과목</span>
        <span>내용</span>
        <span>D-day</span>
        <span>{actionLabel}</span>
      </div>
    </div>
  )
}

function DeadlineRow({
  assignment,
  disabled,
  onToggleSubmitted,
}: {
  assignment: Assignment
  disabled: boolean
  onToggleSubmitted: (assignment: Assignment) => Promise<void>
}) {
  return (
    <li className={styles.assignmentRow}>
      <div className={styles.subjectCell}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
        >
          {assignment.subjectName ?? '미지정'}
        </span>
      </div>

      <div className={styles.contentCell}>
        <p className={styles.assignmentName}>{assignment.title}</p>
        <p className={styles.assignmentDetail}>마감 {formatDueDetail(assignment.dueDate)}</p>
      </div>

      <div className={styles.ddayCell}>
        <span className={styles.ddayBadge}>{getDdayLabel(assignment.dueDate)}</span>
      </div>

      <div className={styles.actionCell}>
        <SubmittedToggle assignment={assignment} disabled={disabled} onToggle={onToggleSubmitted} />
      </div>
    </li>
  )
}

function FavoriteRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className={styles.assignmentRow}>
      <div className={styles.subjectCell}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
        >
          {assignment.subjectName ?? '미지정'}
        </span>
      </div>

      <div className={styles.contentCell}>
        <p className={styles.assignmentName}>{assignment.title}</p>
        <p className={styles.assignmentDetail}>마감 {formatDueDetail(assignment.dueDate)}</p>
      </div>

      <div className={styles.ddayCell}>
        <span className={styles.ddayBadge}>{getDdayLabel(assignment.dueDate)}</span>
      </div>

      <div className={styles.actionCell}>
        <span className={`${styles.pinBadge} ${styles.pinBadgeActive}`} aria-label="고정한 과제">
          <PinIcon />
        </span>
      </div>
    </li>
  )
}

export function HomePage() {
  const { isAdmin } = useAuth()
  const { assignments, storageSummary, isLoading, dataError, storageError, refreshAll } =
    useUserWorkspace()
  const [isSaving, setIsSaving] = useState(false)

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const favoriteAssignments = useMemo(
    () => sortedAssignments.filter((assignment) => assignment.isFavorite).slice(0, 4),
    [sortedAssignments],
  )
  const upcomingAssignments = useMemo(() => sortedAssignments.slice(0, 3), [sortedAssignments])

  async function handleToggleSubmitted(assignment: Assignment) {
    setIsSaving(true)
    const { error } = await toggleAssignmentFlags(assignment.id, {
      submitted: !assignment.submitted,
    })
    setIsSaving(false)

    if (!error) {
      await refreshAll()
    }
  }

  return (
    <div className={styles.grid}>
      <div className={styles.leftColumn}>
        <UsageCard
          title="내 저장공간"
          used={storageSummary.personalBytes}
          total={storageSummary.personalLimitBytes}
          circular
        />
        {isAdmin ? (
          <UsageCard
            title="전체 저장공간"
            used={storageSummary.totalBytes}
            total={storageSummary.totalLimitBytes}
          />
        ) : null}
        {storageError ? (
          <p className={styles.helperText}>
            저장공간 수치는 첨부 파일 메타데이터 기준으로 계산됩니다. 최신 업로드가 반영되기까지
            잠시 걸릴 수 있습니다.
          </p>
        ) : null}
      </div>

      <section className={`${styles.panel} ${styles.tallPanel}`}>
        <PanelHeader title="다가오는 마감" actionLabel="제출" />

        {isLoading ? <p className={styles.helperText}>과제 데이터를 불러오는 중입니다...</p> : null}
        {dataError ? <p className={styles.helperText}>{dataError}</p> : null}
        {!isLoading && !dataError ? (
          <ul className={styles.list}>
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((assignment) => (
                <DeadlineRow
                  key={assignment.id}
                  assignment={assignment}
                  disabled={isSaving}
                  onToggleSubmitted={handleToggleSubmitted}
                />
              ))
            ) : (
              <li className={styles.emptyRow}>
                <p className={styles.assignmentDetail}>
                  아직 등록된 과제가 없습니다. 과제 관리 탭에서 첫 과제를 추가해 보세요.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>

      <section className={`${styles.panel} ${styles.bottomPanel}`}>
        <PanelHeader title="고정한 과제" actionLabel="고정" />

        {!isLoading && !dataError ? (
          <ul className={styles.list}>
            {favoriteAssignments.length > 0 ? (
              favoriteAssignments.map((assignment) => (
                <FavoriteRow key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <li className={styles.emptyRow}>
                <p className={styles.assignmentDetail}>
                  핀 버튼을 누른 과제가 이 카드의 맨 위에 고정되어 표시됩니다.
                </p>
              </li>
            )}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
