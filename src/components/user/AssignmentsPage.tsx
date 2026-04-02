import { useMemo, useState } from 'react'
import { assignments as initialAssignments, subjects as initialSubjects } from '../../data/mockData'
import type { Assignment, Subject } from '../../types'
import { NewAssignmentModal } from './NewAssignmentModal'
import styles from './AssignmentsPage.module.css'

const pastelOptions = [
  '#f3afc9',
  '#a9dfe4',
  '#f5d295',
  '#ddc0f3',
  '#d7dee7',
  '#c7ebd6',
  '#f7cdb8',
  '#d0daf5',
]

function getSubject(subjectList: Subject[], subjectId: string) {
  return subjectList.find((subject) => subject.id === subjectId)
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

interface NewSubjectModalProps {
  onClose: () => void
  onCreate: (subject: Subject) => void
}

function NewSubjectModal({ onClose, onCreate }: NewSubjectModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(pastelOptions[0])

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    onCreate({
      id: trimmed.toLowerCase().replace(/\s+/g, '-'),
      name: trimmed,
      color,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.subjectModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-subject-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.subjectModalHeader}>
          <h2 id="new-subject-title" className={styles.subjectModalTitle}>
            New Subject
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close subject modal">
            ×
          </button>
        </header>

        <label className={styles.subjectField}>
          <span>Subject name</span>
          <input
            type="text"
            placeholder="e.g. Literature"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className={styles.subjectField}>
          <span>Pastel color</span>
          <div className={styles.colorGrid}>
            {pastelOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={option === color ? `${styles.colorSwatch} ${styles.colorSwatchActive}` : styles.colorSwatch}
                style={{ backgroundColor: option }}
                onClick={() => setColor(option)}
                aria-label={`Pick color ${option}`}
              />
            ))}
          </div>
        </div>

        <button className={styles.createSubjectButton} type="button" onClick={handleCreate}>
          Add Subject
        </button>
      </section>
    </div>
  )
}

export function AssignmentsPage() {
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [subjectList, setSubjectList] = useState(initialSubjects)

  const filteredAssignments = useMemo(() => {
    if (subjectFilter === 'all') {
      return initialAssignments
    }

    return initialAssignments.filter((assignment) => assignment.subjectId === subjectFilter)
  }, [subjectFilter])

  function handleCreateSubject(subject: Subject) {
    const exists = subjectList.some((entry) => entry.id === subject.id || entry.name === subject.name)
    if (exists) {
      return
    }

    setSubjectList((current) => [...current, subject])
    setSubjectFilter(subject.id)
  }

  return (
    <>
      <section className={styles.library}>
        <div className={styles.toolbar}>
          <h1 className={styles.title}>Assignment Library</h1>
          <div className={styles.actions}>
            <label className={styles.selectShell}>
              <span className={styles.visuallyHidden}>Filter by subject</span>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="all">All Subjects</option>
                {subjectList.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <button className={styles.ghostButton} type="button" onClick={() => setIsSubjectModalOpen(true)}>
              + Subject
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setIsAssignmentModalOpen(true)}
            >
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
              {filteredAssignments.map((assignment) => {
                const subject = getSubject(subjectList, assignment.subjectId)
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

      {isAssignmentModalOpen ? (
        <NewAssignmentModal onClose={() => setIsAssignmentModalOpen(false)} />
      ) : null}
      {isSubjectModalOpen ? (
        <NewSubjectModal
          onClose={() => setIsSubjectModalOpen(false)}
          onCreate={handleCreateSubject}
        />
      ) : null}
    </>
  )
}
