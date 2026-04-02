import type { CSSProperties } from 'react'
import { useAuth } from '../../auth/useAuth'
import { assignments, subjects } from '../../data/mockData'
import { useStorageUsage } from '../../hooks/useStorageUsage'
import type { Assignment } from '../../types'
import styles from './HomePage.module.css'

function getSubjectColor(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.color ?? '#d7dee7'
}

function getSubjectName(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.name ?? 'Unknown'
}

function UsageCard({ used, total }: { used: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Storage</h2>
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
          <span>USED</span>
        </div>
      </div>
      <p className={styles.usageLabel}>{used}MB of {total}MB used</p>
    </section>
  )
}

function TotalUsageCard({ used, totalMb }: { used: number; totalMb: number }) {
  const percentage = totalMb > 0 ? Math.min(100, Math.round((used / totalMb) * 100)) : 0

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Group Total</h2>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <p className={styles.usageLabel}>{used}MB of {totalMb / 1024}GB used by group</p>
    </section>
  )
}

function DeadlineRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className={styles.listRow}>
      <div className={styles.rowMeta}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: getSubjectColor(assignment.subjectId) }}
        >
          {getSubjectName(assignment.subjectId)}
        </span>
        <div>
          <p className={styles.assignmentName}>{assignment.title}</p>
          <p className={styles.assignmentDetail}>{assignment.detail}</p>
        </div>
      </div>
      <button className={styles.rowButton} aria-label={`${assignment.title} details`} />
    </li>
  )
}

function FavoriteRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className={styles.listRow}>
      <div className={styles.rowMeta}>
        <span
          className={styles.subjectPill}
          style={{ backgroundColor: getSubjectColor(assignment.subjectId) }}
        >
          {getSubjectName(assignment.subjectId)}
        </span>
        <div>
          <p className={styles.assignmentName}>{assignment.title}</p>
          <p className={styles.assignmentDetail}>{assignment.detail}</p>
        </div>
      </div>
      <button className={`${styles.star} ${styles.starActive}`} aria-label="Favorited">
        ★
      </button>
    </li>
  )
}

export function HomePage() {
  const { isAdmin } = useAuth()
  const { personalUsedMb, personalLimitMb, totalUsedMb, totalLimitMb, error } = useStorageUsage()
  const favoriteAssignments = assignments.filter((assignment) => assignment.isFavorite)
  const upcomingAssignments = assignments.slice(0, 3)

  return (
    <div className={styles.grid}>
      <div className={styles.leftColumn}>
        <UsageCard used={personalUsedMb} total={personalLimitMb} />
        {isAdmin ? <TotalUsageCard used={totalUsedMb} totalMb={totalLimitMb} /> : null}
        {error ? (
          <p className={styles.helperText}>Storage numbers reflect uploaded files after the asset table is in place.</p>
        ) : null}
      </div>

      <section className={`${styles.panel} ${styles.tallPanel}`}>
        <h1 className={styles.panelTitle}>Upcoming Deadlines</h1>
        <ul className={styles.list}>
          {upcomingAssignments.map((assignment) => (
            <DeadlineRow key={assignment.id} assignment={assignment} />
          ))}
        </ul>
      </section>

      <section className={`${styles.panel} ${styles.bottomPanel}`}>
        <h1 className={styles.panelTitle}>Favorites</h1>
        <ul className={styles.list}>
          {favoriteAssignments.map((assignment) => (
            <FavoriteRow key={assignment.id} assignment={assignment} />
          ))}
        </ul>
      </section>
    </div>
  )
}
