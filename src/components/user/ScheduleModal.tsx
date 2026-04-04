import { useEffect, useState } from 'react'
import type { ScheduleEvent } from '../../types'
import { updateSchedule, createSchedule } from '../../lib/schedules'
import styles from './ScheduleModal.module.css'

interface ScheduleModalProps {
  schedule: ScheduleEvent | null
  subjects: Array<{ id: string; name: string; color: string }>
  onClose: () => void
  onSaved: () => void
  isSaving: boolean
}

export function ScheduleModal({ schedule, subjects, onClose, onSaved, isSaving }: ScheduleModalProps) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [color, setColor] = useState('#9bb4c8')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title || '')
      setSubjectId(schedule.subjectId || '')
      const startDate = new Date(schedule.startsAt)
      setStartsAt(startDate.toISOString().slice(0, 16))
      if (schedule.endsAt) {
        const endDate = new Date(schedule.endsAt)
        setEndsAt(endDate.toISOString().slice(0, 16))
      }
      setIsAllDay(schedule.isAllDay ?? false)
      setLocation(schedule.location || '')
      setNote(schedule.note || '')
      setColor(schedule.color || '#9bb4c8')
    } else {
      setTitle('')
      setSubjectId('')
      setStartsAt('')
      setEndsAt('')
      setIsAllDay(false)
      setLocation('')
      setNote('')
      setColor('#9bb4c8')
    }
    setError(null)
  }, [schedule])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!title.trim()) {
        setError('제목을 입력해주세요')
        return
      }

      if (!startsAt) {
        setError('시작 시간을 선택해주세요')
        return
      }

      if (!isAllDay && !endsAt) {
        setError('종료 시간을 선택해주세요')
        return
      }

      const startsAtDate = new Date(startsAt)
      const endsAtDate = endsAt ? new Date(endsAt) : undefined

      if (schedule) {
        const { error: updateError } = await updateSchedule(schedule.id, {
          title: title.trim(),
          subjectId: subjectId || null,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate ? endsAtDate.toISOString() : null,
          isAllDay,
          location: location.trim() || undefined,
          note: note.trim() || undefined,
          color,
        })

        if (updateError) {
          setError(updateError.message || '일정 수정에 실패했습니다')
          return
        }
      } else {
        const { error: createError } = await createSchedule({
          title: title.trim(),
          subjectId: subjectId || undefined,
          startsAt: startsAtDate.toISOString(),
          endsAt: endsAtDate ? endsAtDate.toISOString() : undefined,
          isAllDay,
          location: location.trim() || undefined,
          note: note.trim() || undefined,
          color,
        })

        if (createError) {
          setError(createError.message || '일정 생성에 실패했습니다')
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
            {schedule ? '일정 수정' : '일정 추가'}
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
              placeholder="일정 제목"
              disabled={isSaving || isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>과목</label>
            <select
              className={styles.input}
              value={subjectId}
              onChange={(e) => {
                const newSubjectId = e.target.value
                setSubjectId(newSubjectId)
                if (newSubjectId) {
                  const selectedSubject = subjects.find(s => s.id === newSubjectId)
                  if (selectedSubject) {
                    setColor(selectedSubject.color)
                  }
                }
              }}
              disabled={isSaving || isSubmitting}
            >
              <option value="">선택 안 함</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  disabled={isSaving || isSubmitting}
                />
                <span>하루종일</span>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>시작 시간 *</label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                className={styles.input}
                value={isAllDay ? startsAt.slice(0, 10) : startsAt}
                onChange={(e) => {
                  if (isAllDay) {
                    setStartsAt(`${e.target.value}T00:00`)
                  } else {
                    setStartsAt(e.target.value)
                  }
                }}
                disabled={isSaving || isSubmitting}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>종료 시간 {!isAllDay && '*'}</label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                className={styles.input}
                value={isAllDay ? (endsAt ? endsAt.slice(0, 10) : '') : endsAt}
                onChange={(e) => {
                  if (isAllDay) {
                    setEndsAt(e.target.value ? `${e.target.value}T23:59` : '')
                  } else {
                    setEndsAt(e.target.value)
                  }
                }}
                disabled={isSaving || isSubmitting}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>위치</label>
            <input
              type="text"
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="위치 입력"
              disabled={isSaving || isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>색상</label>
            <div className={styles.colorPickerContainer}>
              <input
                type="color"
                className={styles.colorPicker}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isSaving || isSubmitting}
              />
              <span className={styles.colorValue}>{color}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>메모</label>
            <textarea
              className={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가 메모"
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
              {isSubmitting ? '저장 중...' : schedule ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
