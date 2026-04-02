import { useMemo, useState } from 'react'
import type { Assignment, Subject } from '../../types'
import styles from './NewAssignmentModal.module.css'

interface AssignmentFormInput {
  subjectId: string
  title: string
  dueDate: string
  submitted: boolean
  description: string
  externalLink: string
  imageFiles: File[]
  attachmentFiles: File[]
}

interface NewAssignmentModalProps {
  assignment?: Assignment | null
  onClose: () => void
  onSaved: () => Promise<void>
  subjects: Subject[]
  remainingBytes: number
  createAssignment: (input: AssignmentFormInput) => Promise<{
    data: Assignment | null
    error: Error | { message: string } | null
  }>
  updateAssignment: (
    assignmentId: string,
    input: AssignmentFormInput,
  ) => Promise<{
    data: Assignment | null
    error: Error | { message: string } | null
  }>
}

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

export function NewAssignmentModal({
  assignment,
  onClose,
  onSaved,
  subjects,
  remainingBytes,
  createAssignment,
  updateAssignment,
}: NewAssignmentModalProps) {
  const isEditMode = Boolean(assignment)
  const [title, setTitle] = useState(assignment?.title ?? '')
  const [subjectId, setSubjectId] = useState(assignment?.subjectId ?? subjects[0]?.id ?? '')
  const [dueDate, setDueDate] = useState(toDateTimeLocalValue(assignment?.dueDate))
  const [description, setDescription] = useState(assignment?.description ?? '')
  const [externalLink, setExternalLink] = useState(assignment?.externalLink ?? '')
  const [submitted, setSubmitted] = useState(assignment?.submitted ?? false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBytes = useMemo(
    () =>
      [...imageFiles, ...attachmentFiles].reduce((total, file) => {
        return total + file.size
      }, 0),
    [attachmentFiles, imageFiles],
  )

  const resolvedSubjectId = subjectId || subjects[0]?.id || ''

  async function handleSubmit() {
    if (!title.trim() || !dueDate || !resolvedSubjectId) {
      setError('과목, 과제명, 마감일시는 필수입니다.')
      return
    }

    if (selectedBytes > remainingBytes) {
      setError(
        `선택한 파일 용량이 남은 한도를 넘었습니다. 남은 용량은 ${bytesToMegabytes(remainingBytes)}MB입니다.`,
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    const payload = {
      subjectId: resolvedSubjectId,
      title,
      dueDate: new Date(dueDate).toISOString(),
      submitted,
      description,
      externalLink,
      imageFiles,
      attachmentFiles,
    }

    const result = assignment
      ? await updateAssignment(assignment.id, payload)
      : await createAssignment(payload)

    if (result.error) {
      setError(result.error.message)
      setIsSubmitting(false)
      return
    }

    await onSaved()
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="assignment-modal-title" className={styles.title}>
            {isEditMode ? '과제 수정' : '새 과제 등록'}
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="모달 닫기">
            ×
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.formColumn}>
            <label className={styles.field}>
              <span>과제명</span>
              <input
                type="text"
                placeholder="예: 발표 자료 정리"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>과목</span>
                <select
                  value={resolvedSubjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>마감일시</span>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>설명</span>
              <textarea
                placeholder="과제에 대한 메모를 적어 두세요."
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>외부 링크</span>
              <input
                type="url"
                placeholder="https://..."
                value={externalLink}
                onChange={(event) => setExternalLink(event.target.value)}
              />
            </label>
          </div>

          <div className={styles.uploadColumn}>
            <div className={styles.uploadField}>
              <span>첨부 파일</span>
              <div className={styles.dropzone}>
                <p className={styles.helperText}>이미지와 일반 파일을 각각 여러 개 올릴 수 있습니다.</p>
                <div className={styles.pickerGrid}>
                  <label className={styles.filePickerLabel}>
                    이미지 추가
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
                    />
                  </label>
                  <label className={styles.filePickerLabel}>
                    파일 추가
                    <input
                      type="file"
                      multiple
                      onChange={(event) => setAttachmentFiles(Array.from(event.target.files ?? []))}
                    />
                  </label>
                </div>
                {assignment?.assets?.length ? (
                  <p className={styles.fileSummary}>기존 첨부 {assignment.assets.length}개 유지됨</p>
                ) : null}
                <p className={styles.fileSummary}>
                  새 이미지 {imageFiles.length}개, 새 파일 {attachmentFiles.length}개, 총{' '}
                  {bytesToMegabytes(selectedBytes)}MB 선택됨
                </p>
              </div>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={submitted}
                onChange={(event) => setSubmitted(event.target.checked)}
              />
              <span>제출 완료로 표시</span>
            </label>

            <p className={styles.helperText}>남은 개인 저장공간 {bytesToMegabytes(remainingBytes)}MB</p>
            {error ? <p className={styles.errorText}>{error}</p> : null}

            <button
              className={styles.submitButton}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (isEditMode ? '수정 중...' : '등록 중...') : isEditMode ? '과제 수정' : '과제 등록'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
