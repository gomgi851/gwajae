import type { CSSProperties } from 'react'
import { assignments, personalUsage, projectUsage, subjects } from '../../data/mockData'
import type { Assignment, UsageStat } from '../../types'
import styles from './HomePage.module.css'

interface HomePageProps {
  isAdminPreview?: boolean
}

function getSubjectColor(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.color ?? '#d7dee7'
}

function getSubjectName(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)?.name ?? 'Unknown'
}

function UsageCard({ stat }: { stat: UsageStat }) {
  const percentage = Math.round((stat.used / stat.total) * 100)

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{stat.label}</h2>
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
      <p className={styles.usageLabel}>
        {stat.used}MB of {stat.total}MB used
      </p>
    </section>
  )
}

function TotalUsageCard({ stat }: { stat: UsageStat }) {
  const percentage = Math.round((stat.used / stat.total) * 100)

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{stat.label}</h2>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
      <p className={styles.usageLabel}>
        {stat.used}MB of {stat.total / 1000}GB used by group
      </p>
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

export function HomePage({ isAdminPreview = true }: HomePageProps) {
  const favoriteAssignments = assignments.filter((assignment) => assignment.isFavorite)
  const upcomingAssignments = assignments.slice(0, 3)

  return (
    <div className={styles.grid}>
      <div className={styles.leftColumn}>
        <UsageCard stat={personalUsage} />
        {isAdminPreview ? <TotalUsageCard stat={projectUsage} /> : null}
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
