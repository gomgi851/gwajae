import { useMemo, useState } from 'react'
import {
  createAssignmentWithAssets,
  deleteAssignment,
  toggleAssignmentFlags,
  updateAssignmentWithAssets,
} from '../../lib/assignments'
import { createSubject } from '../../lib/subjects'
import type { Assignment } from '../../types'
import { EditIcon, PinIcon } from '../common/ActionIcons'
import { NewAssignmentModal } from './NewAssignmentModal'
import { useUserWorkspace } from './useUserWorkspace'
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
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoDate))
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite)
    }

    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
  })
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
        {assignment.submitted ? '✓' : ''}
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
            ×
          </button>
        </header>

        <label className={styles.subjectField}>
          <span>과목명</span>
          <input
            type="text"
            placeholder="예: 선형대수"
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
  const { assignments, subjects, storageSummary, isLoading, dataError, refreshAll } = useUserWorkspace()
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const filteredAssignments = useMemo(() => {
    if (subjectFilter === 'all') {
      return sortedAssignments
    }

    return sortedAssignments.filter((assignment) => assignment.subjectId === subjectFilter)
  }, [sortedAssignments, subjectFilter])

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
    await refreshAll()
  }

  async function handleToggleSubmitted(assignment: Assignment) {
    setIsSaving(true)
    setError(null)

    const { error: updateError } = await toggleAssignmentFlags(assignment.id, {
      submitted: !assignment.submitted,
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await refreshAll()
  }

  async function handleToggleFavorite(assignment: Assignment) {
    setIsSaving(true)
    setError(null)

    const { error: updateError } = await toggleAssignmentFlags(assignment.id, {
      isFavorite: !assignment.isFavorite,
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await refreshAll()
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
    await refreshAll()
  }

  async function handleSavedAssignment() {
    await refreshAll()
  }

  function openCreateModal() {
    setEditingAssignment(null)
    setIsAssignmentModalOpen(true)
  }

  function openEditModal(assignment: Assignment) {
    setEditingAssignment(assignment)
    setIsAssignmentModalOpen(true)
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
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="all">전체 과목</option>
                {subjects.map((subject) => (
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
            <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
              과제 추가
            </button>
          </div>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {dataError ? <p className={styles.errorText}>{dataError}</p> : null}
        {isLoading ? <p className={styles.helperText}>과제 목록을 불러오는 중입니다...</p> : null}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>고정</th>
                <th>과목</th>
                <th>과제명</th>
                <th>마감일시</th>
                <th>제출</th>
                <th>링크</th>
                <th>파일</th>
                <th>수정</th>
                <th aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {!isLoading && filteredAssignments.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={9}>
                    현재 필터에 맞는 과제가 없습니다.
                  </td>
                </tr>
              ) : null}

              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <button
                      type="button"
                      className={
                        assignment.isFavorite ? styles.favoriteActive : styles.favoriteMuted
                      }
                      onClick={() => void handleToggleFavorite(assignment)}
                      disabled={isSaving}
                      aria-label={assignment.isFavorite ? '고정 해제' : '맨 위에 고정'}
                    >
                      <PinIcon className={styles.pinIcon} />
                    </button>
                  </td>
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
                      className={styles.editButton}
                      onClick={() => openEditModal(assignment)}
                      disabled={isSaving}
                      aria-label="과제 수정"
                    >
                      <EditIcon className={styles.editIcon} />
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => void handleDeleteAssignment(assignment)}
                      disabled={isSaving}
                      aria-label="과제 삭제"
                    >
                      ×
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
          key={editingAssignment?.id ?? 'new-assignment'}
          assignment={editingAssignment}
          onClose={() => {
            setEditingAssignment(null)
            setIsAssignmentModalOpen(false)
          }}
          onSaved={handleSavedAssignment}
          subjects={subjects}
          remainingBytes={Math.max(
            0,
            storageSummary.personalLimitBytes - storageSummary.personalBytes,
          )}
          createAssignment={createAssignmentWithAssets}
          updateAssignment={updateAssignmentWithAssets}
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
