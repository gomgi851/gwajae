import { useMemo, useState } from 'react'
import {
  createAssignmentWithAssets,
  deleteAssignment,
  getAssignmentAssetDownloadUrl,
  getAssignmentAssetPreviewKind,
  getAssignmentAssetPreviewUrl,
  toggleAssignmentFlags,
  updateAssignmentWithAssets,
} from '../../lib/assignments'
import { createSubject } from '../../lib/subjects'
import type { Assignment, AssignmentAsset } from '../../types'
import {
  DownloadIcon,
  EditIcon,
  FileStackIcon,
  LinkIcon,
  PinIcon,
  PreviewIcon,
} from '../common/ActionIcons'
import { AssetPreviewModal } from './AssetPreviewModal'
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

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type ViewMode = 'table' | 'calendar'

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

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

function sortAssignments(assignments: Assignment[]) {
  return [...assignments].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite)
    }

    return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
  })
}

function getAssignmentRowClassName(assignment: Assignment) {
  return assignment.submitted ? styles.submittedRow : undefined
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function getInitialCalendarMonth(assignments: Assignment[]) {
  if (assignments.length === 0) {
    return new Date()
  }

  const firstDate = new Date(assignments[0].dueDate)
  return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
}

function getCalendarCells(anchorMonth: Date) {
  const monthStart = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth(), 1)
  const monthEnd = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 0)
  const leadingBlankCount = monthStart.getDay()
  const trailingBlankCount = 6 - monthEnd.getDay()
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - leadingBlankCount)

  const cells: Date[] = []
  const totalCells = monthEnd.getDate() + leadingBlankCount + trailingBlankCount

  for (let index = 0; index < totalCells; index += 1) {
    const nextDate = new Date(gridStart)
    nextDate.setDate(gridStart.getDate() + index)
    cells.push(nextDate)
  }

  return cells
}

function buildAssignmentsByDate(assignments: Assignment[]) {
  return assignments.reduce<Record<string, Assignment[]>>((grouped, assignment) => {
    const key = getDateKey(new Date(assignment.dueDate))
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(assignment)
    return grouped
  }, {})
}

function formatAssetCountLabel(count: number) {
  return `${count}개`
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
            placeholder="예: 자료구조"
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

function AttachmentListModal({
  assignment,
  previewingAssetId,
  onClose,
  onPreview,
  onDownload,
}: {
  assignment: Assignment
  previewingAssetId: string | null
  onClose: () => void
  onPreview: (asset: AssignmentAsset) => Promise<void>
  onDownload: (asset: AssignmentAsset) => Promise<void>
}) {
  const assets = assignment.assets ?? []

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.attachmentsModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachments-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.attachmentsModalHeader}>
          <div>
            <h2 id="attachments-modal-title" className={styles.attachmentsModalTitle}>
              첨부 파일
            </h2>
            <p className={styles.attachmentsModalDescription}>
              {assignment.title} · {assets.length}개 파일
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="첨부 파일 모달 닫기">
            ×
          </button>
        </header>

        {assets.length === 0 ? (
          <p className={styles.helperText}>첨부된 파일이 없습니다.</p>
        ) : (
          <ul className={styles.attachmentsList}>
            {assets.map((asset) => (
              <li key={asset.id} className={styles.attachmentRow}>
                <div className={styles.attachmentInfo}>
                  <span className={styles.attachmentName}>{asset.fileName}</span>
                  <span className={styles.attachmentMeta}>
                    {asset.assetType === 'image' ? '이미지' : '파일'}
                  </span>
                </div>
                <div className={styles.attachmentActions}>
                  {getAssignmentAssetPreviewKind(asset) ? (
                    <button
                      type="button"
                      className={styles.filesIconButton}
                      onClick={() => void onPreview(asset)}
                      disabled={previewingAssetId === asset.id}
                      aria-label={`${asset.fileName} 미리보기`}
                    >
                      <PreviewIcon className={styles.filesIcon} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.filesIconButton}
                    onClick={() => void onDownload(asset)}
                    aria-label={`${asset.fileName} 다운로드`}
                  >
                    <DownloadIcon className={styles.filesIcon} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CalendarDayModal({
  date,
  assignments,
  onClose,
  onOpenAssignment,
}: {
  date: Date
  assignments: Assignment[]
  onClose: () => void
  onOpenAssignment: (assignment: Assignment) => void
}) {
  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.attachmentsModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.attachmentsModalHeader}>
          <div>
            <h2 id="calendar-day-title" className={styles.attachmentsModalTitle}>
              {new Intl.DateTimeFormat('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              }).format(date)}
            </h2>
            <p className={styles.attachmentsModalDescription}>{assignments.length}개의 일정</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="일정 상세 닫기">
            ×
          </button>
        </header>

        <ul className={styles.attachmentsList}>
          {assignments.map((assignment) => (
            <li key={assignment.id} className={styles.attachmentRow}>
              <div className={styles.attachmentInfo}>
                <span
                  className={styles.subjectPill}
                  style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
                >
                  {assignment.subjectName ?? '미지정'}
                </span>
                <span className={styles.attachmentName}>{assignment.title}</span>
                <span className={styles.attachmentMeta}>{formatDueDate(assignment.dueDate)}</span>
              </div>
              <div className={styles.attachmentActions}>
                <button
                  type="button"
                  className={styles.filesIconButton}
                  onClick={() => onOpenAssignment(assignment)}
                  aria-label={`${assignment.title} 상세 열기`}
                >
                  <EditIcon className={styles.filesIcon} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function AssignmentsPage() {
  const { assignments, subjects, storageSummary, isLoading, dataError, refreshAll } =
    useUserWorkspace()
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [isSaving, setIsSaving] = useState(false)
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null)
  const [previewAsset, setPreviewAsset] = useState<AssignmentAsset | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | null>(null)
  const [attachmentsAssignment, setAttachmentsAssignment] = useState<Assignment | null>(null)
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [calendarMonth, setCalendarMonth] = useState(() => getInitialCalendarMonth(assignments))

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const filteredAssignments = useMemo(() => {
    if (subjectFilter === 'all') {
      return sortedAssignments
    }

    return sortedAssignments.filter((assignment) => assignment.subjectId === subjectFilter)
  }, [sortedAssignments, subjectFilter])

  const assignmentsByDate = useMemo(
    () => buildAssignmentsByDate(filteredAssignments),
    [filteredAssignments],
  )
  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth])
  const selectedDateAssignments = useMemo(() => {
    if (!selectedCalendarDate) {
      return []
    }

    return assignmentsByDate[getDateKey(selectedCalendarDate)] ?? []
  }, [assignmentsByDate, selectedCalendarDate])

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

  async function confirmDeleteAssignment() {
    if (!deletingAssignment) {
      return
    }

    setIsSaving(true)
    setError(null)
    const { error: deleteError } = await deleteAssignment(deletingAssignment.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    setDeletingAssignment(null)
    setIsSaving(false)
    await refreshAll()
  }

  async function handleSavedAssignment() {
    await refreshAll()
  }

  async function handleDownloadAsset(asset: AssignmentAsset) {
    const { data, error: downloadError } = await getAssignmentAssetDownloadUrl(asset)

    if (downloadError || !data) {
      setError(downloadError?.message ?? '첨부 파일 다운로드 링크를 불러오지 못했습니다.')
      return
    }

    const link = document.createElement('a')
    link.href = data
    link.download = asset.fileName
    link.rel = 'noreferrer'
    document.body.append(link)
    link.click()
    link.remove()
  }

  async function handlePreviewAsset(asset: AssignmentAsset) {
    const previewKind = getAssignmentAssetPreviewKind(asset)

    if (!previewKind) {
      return
    }

    setPreviewingAssetId(asset.id)
    const [{ data: nextPreviewUrl, error: previewError }, { data: nextDownloadUrl }] = await Promise.all([
      getAssignmentAssetPreviewUrl(asset),
      getAssignmentAssetDownloadUrl(asset),
    ])

    if (previewError || !nextPreviewUrl) {
      setError(previewError?.message ?? '첨부 파일 미리보기를 불러오지 못했습니다.')
      setPreviewingAssetId(null)
      return
    }

    setPreviewAsset(asset)
    setPreviewUrl(nextPreviewUrl)
    setPreviewDownloadUrl(nextDownloadUrl ?? null)
    setPreviewingAssetId(null)
  }

  function openCreateModal() {
    setEditingAssignment(null)
    setIsAssignmentModalOpen(true)
  }

  function openEditModal(assignment: Assignment) {
    setEditingAssignment(assignment)
    setSelectedCalendarDate(null)
    setIsAssignmentModalOpen(true)
  }

  function openAttachmentsModal(assignment: Assignment) {
    if (!assignment.assets?.length) {
      return
    }

    setAttachmentsAssignment(assignment)
  }

  return (
    <>
      <section className={styles.library}>
        <div className={styles.toolbar}>
          <div className={styles.headingGroup}>
            <h1 className={styles.title}>과제 보관함</h1>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={
                  viewMode === 'table'
                    ? `${styles.viewButton} ${styles.viewButtonActive}`
                    : styles.viewButton
                }
                onClick={() => setViewMode('table')}
              >
                표
              </button>
              <button
                type="button"
                className={
                  viewMode === 'calendar'
                    ? `${styles.viewButton} ${styles.viewButtonActive}`
                    : styles.viewButton
                }
                onClick={() => setViewMode('calendar')}
              >
                캘린더
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <label className={styles.selectShell}>
              <span className={styles.visuallyHidden}>과목별 필터</span>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
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

        {viewMode === 'table' ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colPin} />
                <col className={styles.colSubject} />
                <col className={styles.colTitle} />
                <col className={styles.colDueDate} />
                <col className={styles.colSubmitted} />
                <col className={styles.colLink} />
                <col className={styles.colFiles} />
                <col className={styles.colEdit} />
                <col className={styles.colDelete} />
              </colgroup>
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
                  <tr key={assignment.id} className={getAssignmentRowClassName(assignment)}>
                    <td>
                      <button
                        type="button"
                        className={assignment.isFavorite ? styles.favoriteActive : styles.favoriteMuted}
                        onClick={() => void handleToggleFavorite(assignment)}
                        disabled={isSaving}
                        aria-label={assignment.isFavorite ? '고정 해제' : '맨 위로 고정'}
                      >
                        <PinIcon className={styles.pinIcon} />
                      </button>
                    </td>
                    <td>
                      <span
                        className={
                          assignment.submitted
                            ? `${styles.subjectPill} ${styles.submittedSubjectPill}`
                            : styles.subjectPill
                        }
                        style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
                      >
                        {assignment.subjectName ?? '미지정'}
                      </span>
                    </td>
                    <td className={assignment.submitted ? styles.titleCellSubmitted : styles.titleCell}>
                      <div className={styles.titleStack}>
                        <span>{assignment.title}</span>
                        {assignment.submitted ? <span className={styles.submittedBadge}>제출 완료</span> : null}
                      </div>
                    </td>
                    <td className={assignment.submitted ? styles.dateCellSubmitted : styles.dateCell}>
                      {formatDueDate(assignment.dueDate)}
                    </td>
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
                          className={
                            assignment.submitted
                              ? `${styles.linkPill} ${styles.linkPillSubmitted}`
                              : styles.linkPill
                          }
                          href={assignment.externalLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <LinkIcon className={styles.inlineActionIcon} />
                          <span>열기</span>
                        </a>
                      ) : (
                        <span
                          className={
                            assignment.submitted
                              ? `${styles.helperInline} ${styles.submittedInlineText}`
                              : styles.helperInline
                          }
                        >
                          없음
                        </span>
                      )}
                    </td>
                    <td className={assignment.submitted ? styles.submittedInlineText : undefined}>
                      {assignment.attachmentCount > 0 ? (
                        <button
                          type="button"
                          className={styles.filesTrigger}
                          onClick={() => openAttachmentsModal(assignment)}
                        >
                          <FileStackIcon className={styles.inlineActionIcon} />
                          <span>{formatAssetCountLabel(assignment.attachmentCount)}</span>
                        </button>
                      ) : (
                        <span className={styles.helperInline}>0개</span>
                      )}
                    </td>
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
                        onClick={() => setDeletingAssignment(assignment)}
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
        ) : (
          <section className={styles.calendarPanel}>
            <div className={styles.calendarToolbar}>
              <button
                type="button"
                className={styles.calendarNavButton}
                onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              >
                이전
              </button>
              <h2 className={styles.calendarMonthLabel}>{formatMonthLabel(calendarMonth)}</h2>
              <button
                type="button"
                className={styles.calendarNavButton}
                onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
              >
                다음
              </button>
            </div>

            <div className={styles.calendarWeekdays}>
              {weekdayLabels.map((label, index) => (
                <span
                  key={label}
                  className={
                    index === 0
                      ? styles.calendarSunday
                      : index === 6
                        ? styles.calendarSaturday
                        : undefined
                  }
                >
                  {label}
                </span>
              ))}
            </div>

            <div className={styles.calendarGrid}>
              {calendarCells.map((cellDate) => {
                const dateKey = getDateKey(cellDate)
                const dayAssignments = assignmentsByDate[dateKey] ?? []
                const isCurrentMonth = cellDate.getMonth() === calendarMonth.getMonth()
                const isToday = getDateKey(new Date()) === dateKey
                const isSunday = cellDate.getDay() === 0
                const isSaturday = cellDate.getDay() === 6

                return (
                  <article
                    key={dateKey}
                    className={
                      isCurrentMonth
                        ? `${styles.calendarCell} ${isToday ? styles.calendarCellToday : ''}`
                        : `${styles.calendarCell} ${styles.calendarCellMuted}`
                    }
                  >
                    <div className={styles.calendarCellHeader}>
                      <span
                        className={[
                          styles.calendarDateNumber,
                          isToday ? styles.calendarDateNumberToday : '',
                          !isToday && isSunday ? styles.calendarDateNumberSunday : '',
                          !isToday && isSaturday ? styles.calendarDateNumberSaturday : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {cellDate.getDate()}
                      </span>
                    </div>

                    <div className={styles.calendarAssignments}>
                      {dayAssignments.slice(0, 2).map((assignment) => (
                        <button
                          key={assignment.id}
                          type="button"
                          className={
                            assignment.submitted
                              ? `${styles.calendarAssignment} ${styles.calendarAssignmentSubmitted}`
                              : styles.calendarAssignment
                          }
                          onClick={() => openEditModal(assignment)}
                        >
                          <span className={styles.calendarAssignmentLine}>
                            <span
                              className={styles.calendarAssignmentSubject}
                              style={{ backgroundColor: assignment.subjectColor ?? '#d7dee7' }}
                            >
                              {assignment.subjectName ?? '미지정'}
                            </span>
                            <span className={styles.calendarAssignmentTitle}>{assignment.title}</span>
                          </span>
                        </button>
                      ))}

                      {dayAssignments.length > 2 ? (
                        <button
                          type="button"
                          className={styles.calendarMore}
                          onClick={() => setSelectedCalendarDate(cellDate)}
                        >
                          +{dayAssignments.length - 2}개 더보기
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
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
          remainingBytes={Math.max(0, storageSummary.personalLimitBytes - storageSummary.personalBytes)}
          createAssignment={createAssignmentWithAssets}
          updateAssignment={updateAssignmentWithAssets}
        />
      ) : null}

      {deletingAssignment ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              setDeletingAssignment(null)
            }
          }}
        >
          <section
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-assignment-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteModalHeader}>
              <div>
                <h2 id="delete-assignment-title" className={styles.deleteModalTitle}>
                  과제를 삭제할까요?
                </h2>
                <p className={styles.deleteModalDescription}>
                  <strong>{deletingAssignment.title}</strong> 과제를 삭제하면 첨부 파일까지 함께 사라지며
                  복구할 수 없습니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.deleteModalClose}
                onClick={() => setDeletingAssignment(null)}
                disabled={isSaving}
                aria-label="삭제 확인 닫기"
              >
                ×
              </button>
            </div>

            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.deleteModalCancel}
                onClick={() => setDeletingAssignment(null)}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.deleteModalConfirm}
                onClick={() => void confirmDeleteAssignment()}
                disabled={isSaving}
              >
                삭제하기
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {attachmentsAssignment ? (
        <AttachmentListModal
          assignment={attachmentsAssignment}
          previewingAssetId={previewingAssetId}
          onClose={() => setAttachmentsAssignment(null)}
          onPreview={handlePreviewAsset}
          onDownload={handleDownloadAsset}
        />
      ) : null}

      {previewAsset && previewUrl ? (
        <AssetPreviewModal
          asset={previewAsset}
          previewUrl={previewUrl}
          downloadUrl={previewDownloadUrl}
          onClose={() => {
            setPreviewAsset(null)
            setPreviewUrl(null)
            setPreviewDownloadUrl(null)
          }}
        />
      ) : null}

      {isSubjectModalOpen ? (
        <NewSubjectModal
          onClose={() => setIsSubjectModalOpen(false)}
          onCreate={handleCreateSubject}
          isSaving={isSaving}
        />
      ) : null}

      {selectedCalendarDate ? (
        <CalendarDayModal
          date={selectedCalendarDate}
          assignments={selectedDateAssignments}
          onClose={() => setSelectedCalendarDate(null)}
          onOpenAssignment={openEditModal}
        />
      ) : null}
    </>
  )
}
