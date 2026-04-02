import { useMemo, useState } from 'react'
import type { Assignment, Subject } from '../../types'
import styles from './NewAssignmentModal.module.css'

interface CreateAssignmentInput {
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
  onClose: () => void
  onCreated: () => Promise<void>
  subjects: Subject[]
  remainingBytes: number
  createAssignment: (input: CreateAssignmentInput) => Promise<{
    data: Assignment | null
    error: Error | { message: string } | null
  }>
}

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

export function NewAssignmentModal({
  onClose,
  onCreated,
  subjects,
  remainingBytes,
  createAssignment,
}: NewAssignmentModalProps) {
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [submitted, setSubmitted] = useState(false)
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
      setError('과목, 과제명, 마감일은 필수입니다.')
      return
    }

    if (selectedBytes > remainingBytes) {
      setError(
        `선택한 파일 용량이 너무 큽니다. 남은 용량은 ${bytesToMegabytes(remainingBytes)}MB입니다.`,
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: createError } = await createAssignment({
      subjectId: resolvedSubjectId,
      title,
      dueDate,
      submitted,
      description,
      externalLink,
      imageFiles,
      attachmentFiles,
    })

    if (createError) {
      setError(createError.message)
      setIsSubmitting(false)
      return
    }

    await onCreated()
    setIsSubmitting(false)
    onClose()
  }

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
            새 과제 등록
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="모달 닫기">
            x
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.formColumn}>
            <label className={styles.field}>
              <span>과제명</span>
              <input
                type="text"
                placeholder="예: 한국사 발표 자료"
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
                <span>마감일</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>설명</span>
              <textarea
                placeholder="과제에 대한 간단한 메모를 적어 두세요."
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
              <span>첨부파일</span>
              <div className={styles.dropzone}>
                <p className={styles.helperText}>이미지와 파일을 여러 개 올릴 수 있습니다.</p>
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
                <p className={styles.fileSummary}>
                  이미지 {imageFiles.length}개, 파일 {attachmentFiles.length}개, 총{' '}
                  {bytesToMegabytes(selectedBytes)}MB 선택됨
                </p>
                {imageFiles.length > 0 ? (
                  <ul className={styles.fileList}>
                    {imageFiles.slice(0, 3).map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                ) : null}
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

            <p className={styles.helperText}>
              남은 개인 저장공간: {bytesToMegabytes(remainingBytes)}MB
            </p>
            {error ? <p className={styles.errorText}>{error}</p> : null}

            <button
              className={styles.submitButton}
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '과제 등록'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
