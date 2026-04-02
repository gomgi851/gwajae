import { useState } from 'react'
import { subjects } from '../../data/mockData'
import styles from './NewAssignmentModal.module.css'

interface NewAssignmentModalProps {
  onClose: () => void
}

export function NewAssignmentModal({ onClose }: NewAssignmentModalProps) {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-assignment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="new-assignment-title" className={styles.title}>
            New Assignment
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.formColumn}>
            <label className={styles.field}>
              <span>Assignment Title</span>
              <input type="text" placeholder="e.g. History Final Essay" />
            </label>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Subject</span>
                <select defaultValue="">
                  <option value="" disabled>
                    Select Subject
                  </option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Due Date</span>
                <input type="date" />
              </label>
            </div>

            <label className={styles.field}>
              <span>Description</span>
              <textarea placeholder="Brief project brief..." rows={4} />
            </label>

            <label className={styles.field}>
              <span>External Link</span>
              <input type="url" placeholder="https://canvas.instructure.com/..." />
            </label>
          </div>

          <div className={styles.uploadColumn}>
            <div className={styles.uploadField}>
              <span>Attachments</span>
              <button className={styles.dropzone} type="button">
                <span className={styles.cloud}>☁</span>
                <span>Drop images or files here to upload</span>
              </button>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={submitted}
                onChange={(event) => setSubmitted(event.target.checked)}
              />
              <span>Mark as submitted</span>
            </label>

            <button className={styles.submitButton} type="button">
              Create Assignment
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
