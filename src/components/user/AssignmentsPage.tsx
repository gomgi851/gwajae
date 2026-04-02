import { useEffect, useMemo, useState } from 'react'
import {
  createAssignmentWithAssets,
  deleteAssignment,
  fetchAssignments,
  updateAssignment,
} from '../../lib/assignments'
import { createSubject, ensureDefaultSubject, fetchSubjects } from '../../lib/subjects'
import { useStorageUsage } from '../../hooks/useStorageUsage'
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

function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate))
}

function SubmittedToggle({
  assignment,
  onToggle,
  disabled,
}: {
  assignment: Assignment
  onToggle: (assignment: Assignment) => Promise<void>
  disabled: boolean
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
        {assignment.submitted ? 'v' : ''}
      </span>
    </button>
  )
}

interface NewSubjectModalProps {
  onClose: () => void
  onCreate: (name: string, color: string) => Promise<void>
  isSaving: boolean
}

function NewSubjectModal({ onClose, onCreate, isSaving }: NewSubjectModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(pastelOptions[0])
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('과목명을 먼저 입력해 주세요.')
      return
    }

    setError(null)
    await onCreate(trimmed, color)
    setName('')
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
            새 과목 추가
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="과목 모달 닫기">
            x
          </button>
        </header>

        <label className={styles.subjectField}>
          <span>과목명</span>
          <input
            type="text"
            placeholder="예: 문학"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className={styles.subjectField}>
          <span>파스텔 색상</span>
          <div className={styles.colorGrid}>
            {pastelOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  option === color
                    ? `${styles.colorSwatch} ${styles.colorSwatchActive}`
                    : styles.colorSwatch
                }
                style={{ backgroundColor: option }}
                onClick={() => setColor(option)}
                aria-label={`색상 ${option} 선택`}
              />
            ))}
          </div>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <button
          className={styles.createSubjectButton}
          type="button"
          onClick={() => void handleCreate()}
          disabled={isSaving}
        >
          과목 추가
        </button>
      </section>
    </div>
  )
}

export function AssignmentsPage() {
  const { summary, refresh: refreshUsage } = useStorageUsage()
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [subjectList, setSubjectList] = useState<Subject[]>([])
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setIsLoading(true)
    setError(null)

    const { error: defaultError } = await ensureDefaultSubject()
    if (defaultError) {
      setError(defaultError.message)
      setIsLoading(false)
      return
    }

    const [
      { data: nextSubjects, error: subjectError },
      { data: nextAssignments, error: assignmentError },
    ] = await Promise.all([fetchSubjects(), fetchAssignments()])

    if (subjectError || assignmentError) {
      setError(subjectError?.message ?? assignmentError?.message ?? '과제 목록을 불러오지 못했습니다.')
      setSubjectList(nextSubjects ?? [])
      setAssignmentList(nextAssignments ?? [])
      setIsLoading(false)
      return
    }

    setSubjectList(nextSubjects ?? [])
    setAssignmentList(nextAssignments ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [])

  const activeSubjectFilter =
    subjectFilter !== 'all' && !subjectList.some((subject) => subject.id === subjectFilter)
      ? 'all'
      : subjectFilter

  const filteredAssignments = useMemo(() => {
    if (activeSubjectFilter === 'all') {
      return assignmentList
    }

    return assignmentList.filter((assignment) => assignment.subjectId === activeSubjectFilter)
  }, [activeSubjectFilter, assignmentList])

  async function handleCreateSubject(name: string, color: string) {
    setIsSaving(true)
    setError(null)

    const { data, error: createError } = await createSubject(name, color)
    if (createError) {
      setError(createError.message)
      setIsSaving(false)
      return
    }

    if (data) {
      setSubjectFilter(data.id)
    }

    setIsSaving(false)
    setIsSubjectModalOpen(false)
    await loadData()
  }

  async function handleToggleSubmitted(assignment: Assignment) {
    setIsSaving(true)
    setError(null)
    const { error: updateError } = await updateAssignment(assignment.id, {
      submitted: !assignment.submitted,
    })
    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }
    setIsSaving(false)
    await loadData()
  }

  async function handleToggleFavorite(assignment: Assignment) {
    setIsSaving(true)
    setError(null)
    const { error: updateError } = await updateAssignment(assignment.id, {
      isFavorite: !assignment.isFavorite,
    })
    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }
    setIsSaving(false)
    await loadData()
  }

  async function handleDeleteAssignment(assignment: Assignment) {
    setIsSaving(true)
    setError(null)
    const { error: deleteError } = await deleteAssignment(assignment.id)
    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }
    setIsSaving(false)
    refreshUsage()
    await loadData()
  }

  async function handleCreatedAssignment() {
    refreshUsage()
    await loadData()
  }

  return (
    <>
      <section className={styles.library}>
        <div className={styles.toolbar}>
          <h1 className={styles.title}>과제 보관함</h1>
          <div className={styles.actions}>
            <label className={styles.selectShell}>
              <span className={styles.visuallyHidden}>과목별 필터</span>
              <select
                value={activeSubjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="all">전체 과목</option>
                {subjectList.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={styles.ghostButton}
              type="button"
              onClick={() => setIsSubjectModalOpen(true)}
            >
              + 과목
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setIsAssignmentModalOpen(true)}
            >
              과제 추가
            </button>
          </div>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {isLoading ? <p className={styles.helperText}>과제 목록을 불러오는 중입니다...</p> : null}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>과목</th>
                <th>과제명</th>
                <th>마감일</th>
                <th>제출</th>
                <th>즐겨찾기</th>
                <th>링크</th>
                <th>파일</th>
                <th aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {!isLoading && filteredAssignments.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={8}>
                    이 필터에 맞는 과제가 아직 없습니다.
                  </td>
                </tr>
              ) : null}

              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <span
                      className={styles.subjectPill}
                      style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
                    >
                      {assignment.subjectName ?? '미지정'}
                    </span>
                  </td>
                  <td className={styles.titleCell}>{assignment.title}</td>
                  <td>{formatDueDate(assignment.dueDate)}</td>
                  <td>
                    <SubmittedToggle
                      assignment={assignment}
                      onToggle={handleToggleSubmitted}
                      disabled={isSaving}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={assignment.isFavorite ? styles.favoriteActive : styles.favoriteMuted}
                      onClick={() => void handleToggleFavorite(assignment)}
                      disabled={isSaving}
                      aria-label={assignment.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    >
                      *
                    </button>
                  </td>
                  <td>
                    {assignment.externalLink ? (
                      <a
                        className={styles.linkAnchor}
                        href={assignment.externalLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        열기
                      </a>
                    ) : (
                      <span className={styles.helperText}>없음</span>
                    )}
                  </td>
                  <td className={styles.filesCell}>{assignment.attachmentCount}개</td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => void handleDeleteAssignment(assignment)}
                      disabled={isSaving}
                      aria-label="과제 삭제"
                    >
                      x
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAssignmentModalOpen ? (
        <NewAssignmentModal
          onClose={() => setIsAssignmentModalOpen(false)}
          onCreated={handleCreatedAssignment}
          subjects={subjectList}
          remainingBytes={Math.max(0, summary.personalLimitBytes - summary.personalBytes)}
          createAssignment={createAssignmentWithAssets}
        />
      ) : null}
      {isSubjectModalOpen ? (
        <NewSubjectModal
          onClose={() => setIsSubjectModalOpen(false)}
          onCreate={handleCreateSubject}
          isSaving={isSaving}
        />
      ) : null}
    </>
  )
}
