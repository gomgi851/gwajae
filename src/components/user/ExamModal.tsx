import { useEffect, useState } from 'react'
import type { Exam } from '../../types'
import { updateExam, createExam } from '../../lib/exams'
import styles from './ExamModal.module.css'

interface ExamModalProps {
  exam: Exam | null
  subjects: Array<{ id: string; name: string; color: string }>
  onClose: () => void
  onSaved: () => void
  isSaving: boolean
}

export function ExamModal({ exam, subjects, onClose, onSaved, isSaving }: ExamModalProps) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [examAt, setExamAt] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (exam) {
      setTitle(exam.title || '')
      setSubjectId(exam.subjectId || '')
      const date = new Date(exam.examAt)
      setExamAt(date.toISOString().slice(0, 16))
      setDescription(exam.description || '')
    } else {
      setTitle('')
      setSubjectId(subjects[0]?.id || '')
      setExamAt('')
      setDescription('')
    }
    setError(null)
  }, [exam, subjects])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!title.trim()) {
        setError('제목을 입력해주세요')
        return
      }

      if (!subjectId) {
        setError('과목을 선택해주세요')
        return
      }

      if (!examAt) {
        setError('시험 시간을 선택해주세요')
        return
      }

      if (exam) {
        const { error: updateError } = await updateExam(exam.id, {
          title: title.trim(),
          subjectId,
          examAt: new Date(examAt).toISOString(),
          description: description.trim() || undefined,
        })

        if (updateError) {
          setError(updateError.message || '시험 수정에 실패했습니다')
          return
        }
      } else {
        const { error: createError } = await createExam({
          title: title.trim(),
          subjectId,
          examAt: new Date(examAt).toISOString(),
          description: description.trim() || undefined,
        })

        if (createError) {
          setError(createError.message || '시험 생성에 실패했습니다')
          return
        }
      }

      onSaved()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {exam ? '시험 수정' : '시험 추가'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSaving || isSubmitting}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.label}>제목 *</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="시험 제목"
              disabled={isSaving || isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>과목 *</label>
            <select
              className={styles.input}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isSaving || isSubmitting}
            >
              <option value="">선택해주세요</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>시험 시간 *</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={examAt}
              onChange={(e) => setExamAt(e.target.value)}
              disabled={isSaving || isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>설명</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가 설명"
              rows={3}
              disabled={isSaving || isSubmitting}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSaving || isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSaving || isSubmitting}
            >
              {isSubmitting ? '저장 중...' : exam ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
