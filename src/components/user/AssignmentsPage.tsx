import { useState } from 'react'
import { assignments, subjects } from '../../data/mockData'
import type { Assignment } from '../../types'
import { NewAssignmentModal } from './NewAssignmentModal'
import styles from './AssignmentsPage.module.css'

function getSubject(subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId)
}

function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(isoDate))
}

function SubmittedToggle({ assignment }: { assignment: Assignment }) {
  return assignment.submitted ? (
    <span className={`${styles.statusCircle} ${styles.statusDone}`}>✓</span>
  ) : (
    <span className={styles.statusCircle} />
  )
}

export function AssignmentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <section className={styles.library}>
        <div className={styles.toolbar}>
          <h1 className={styles.title}>Assignment Library</h1>
          <div className={styles.actions}>
            <button className={styles.ghostButton} type="button">
              All Subjects
              <span aria-hidden="true">⌄</span>
            </button>
            <button className={styles.ghostButton} type="button">
              + Subject
            </button>
            <button className={styles.primaryButton} type="button" onClick={() => setIsModalOpen(true)}>
              Add Assignment
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Title</th>
                <th>Due Date</th>
                <th>Submitted</th>
                <th>Fav</th>
                <th>Files</th>
                <th aria-label="Delete" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const subject = getSubject(assignment.subjectId)
                return (
                  <tr key={assignment.id}>
                    <td>
                      <span
                        className={styles.subjectPill}
                        style={{ backgroundColor: subject?.color ?? '#d7dee7' }}
                      >
                        {subject?.name ?? 'Unknown'}
                      </span>
                    </td>
                    <td className={styles.titleCell}>{assignment.title}</td>
                    <td>{formatDueDate(assignment.dueDate)}</td>
                    <td>
                      <SubmittedToggle assignment={assignment} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={assignment.isFavorite ? styles.favoriteActive : styles.favoriteMuted}
                        aria-label={assignment.isFavorite ? 'Favorited' : 'Not favorited'}
                      >
                        ★
                      </button>
                    </td>
                    <td className={styles.filesCell}>{assignment.attachmentCount} files</td>
                    <td>
                      <button type="button" className={styles.deleteButton} aria-label="Delete assignment">
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? <NewAssignmentModal onClose={() => setIsModalOpen(false)} /> : null}
    </>
  )
}
