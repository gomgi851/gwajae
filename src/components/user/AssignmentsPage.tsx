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
import { deleteExam, toggleExamFlags } from '../../lib/exams'
import { deleteSchedule, toggleScheduleFlags } from '../../lib/schedules'
import { createSubject, updateSubjectColor } from '../../lib/subjects'
import type { Assignment, AssignmentAsset, Exam, ScheduleEvent, Subject } from '../../types'
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
import { ExamModal } from './ExamModal'
import { ScheduleModal } from './ScheduleModal'
import { useUserWorkspace } from './useUserWorkspace'
import styles from './AssignmentsPage.module.css'

const pastelOptions = [
  '#f8c6d8',
  '#f5bdd0',
  '#f2b6ca',
  '#f7c8b8',
  '#f6d2b4',
  '#f5ddb0',
  '#f6e8b8',
  '#e7efb6',
  '#d8eab7',
  '#cbe6bf',
  '#bfe6cd',
  '#b7e7d8',
  '#b4e4e3',
  '#b7dff0',
  '#bfd8f4',
  '#c8d2f5',
  '#d6c9f3',
  '#e2c6ef',
  '#e7ccdd',
  '#d7dee7',
]

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']

type ViewMode = 'table' | 'calendar'
type ItemTypeFilter = 'all' | 'assignment' | 'exam' | 'schedule'
type DDayState = 'today' | 'urgent' | 'past' | 'normal'
type DDayFilter = 'all' | 'today' | 'urgent' | 'past'
type DDaySortMode = 'time' | 'dday'
type TimelineRow =
  | { kind: 'assignment'; sortDate: string; isFavorite: boolean; assignment: Assignment }
  | { kind: 'exam'; sortDate: string; isFavorite: boolean; exam: Exam }
  | { kind: 'schedule'; sortDate: string; isFavorite: boolean; schedule: ScheduleEvent }

function formatDueDate(isoDate: string) {
  return new Intl.DateTimeFormat('ko-KR', {
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

function getDDayDiff(isoDate: string) {
  const target = new Date(isoDate)
  const now = new Date()
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDDay(isoDate: string) {
  const diffDays = getDDayDiff(isoDate)

  if (diffDays === 0) {
    return 'D-Day'
  }

  return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`
}

function getDDayState(isoDate: string): DDayState {
  const diffDays = getDDayDiff(isoDate)

  if (diffDays === 0) {
    return 'today'
  }

  if (diffDays < 0) {
    return 'past'
  }

  if (diffDays <= 3) {
    return 'urgent'
  }

  return 'normal'
}

function getDDayClassName(isoDate: string) {
  const state = getDDayState(isoDate)

  if (state === 'today') {
    return styles.dDayToday
  }

  if (state === 'urgent') {
    return styles.dDayUrgent
  }

  if (state === 'past') {
    return styles.dDayPast
  }

  return styles.dDayNormal
}

function matchesDDayFilter(isoDate: string, filter: DDayFilter) {
  const state = getDDayState(isoDate)
  if (filter === 'all') {
    return true
  }

  if (filter === 'urgent') {
    return state === 'urgent' || state === 'today'
  }

  return state === filter
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

function buildExamsByDate(exams: Exam[]) {
  return exams.reduce<Record<string, Exam[]>>((grouped, exam) => {
    const key = getDateKey(new Date(exam.examAt))
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(exam)
    return grouped
  }, {})
}

function buildSchedulesByDate(schedules: ScheduleEvent[]) {
  return schedules.reduce<Record<string, ScheduleEvent[]>>((grouped, schedule) => {
    const startDate = new Date(schedule.startsAt)
    const endDate = schedule.endsAt ? new Date(schedule.endsAt) : startDate

    // 일정이 하루종일이면 endDate를 자정으로 설정
    if (schedule.isAllDay && schedule.endsAt) {
      endDate.setHours(0, 0, 0, 0)
    }

    // 시작일부터 종료일까지 각 날짜에 일정 추가
    const currentDate = new Date(startDate)
    currentDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    while (currentDate <= endDate) {
      const key = getDateKey(currentDate)
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(schedule)

      currentDate.setDate(currentDate.getDate() + 1)
    }

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

interface SubjectColorModalProps {
  subjects: Subject[]
  onClose: () => void
  onUpdate: (subjectId: string, color: string) => Promise<void>
  isSaving: boolean
}

function SubjectColorModal({ subjects, onClose, onUpdate, isSaving }: SubjectColorModalProps) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [color, setColor] = useState(subjects[0]?.color ?? pastelOptions[0])
  const [error, setError] = useState<string | null>(null)

  async function handleUpdate() {
    if (!subjectId) {
      setError('과목을 먼저 선택해 주세요.')
      return
    }

    setError(null)
    await onUpdate(subjectId, color)
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.subjectModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-subject-color-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.subjectModalHeader}>
          <h2 id="edit-subject-color-title" className={styles.subjectModalTitle}>
            과목 색상 변경
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="과목 색상 모달 닫기">
            ×
          </button>
        </header>

        <label className={styles.subjectField}>
          <span>과목</span>
          <select
            value={subjectId}
            onChange={(event) => {
              const nextId = event.target.value
              setSubjectId(nextId)
              const selectedSubject = subjects.find((subject) => subject.id === nextId)
              if (selectedSubject) {
                setColor(selectedSubject.color)
              }
            }}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.subjectField}>
          <span>색상</span>
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
          onClick={() => void handleUpdate()}
          disabled={isSaving}
        >
          색상 저장
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
  exams,
  schedules,
  onClose,
  onOpenAssignment,
  onOpenExam,
  onOpenSchedule,
}: {
  date: Date
  assignments: Assignment[]
  exams: Exam[]
  schedules: ScheduleEvent[]
  onClose: () => void
  onOpenAssignment: (assignment: Assignment) => void
  onOpenExam: (exam: Exam) => void
  onOpenSchedule: (schedule: ScheduleEvent) => void
}) {
  const allItems = [...assignments, ...exams, ...schedules]

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
            <p className={styles.attachmentsModalDescription}>{allItems.length}개의 일정</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="일정 상세 닫기">
            ×
          </button>
        </header>

        <ul className={styles.attachmentsList}>
          {assignments.map((assignment) => (
            <li key={assignment.id} className={styles.attachmentRow}>
              <div className={styles.attachmentInfo}>
                <span className={styles.itemType} style={{ backgroundColor: '#a8d5ff' }}>
                  과제
                </span>
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

          {exams.map((exam) => (
            <li key={exam.id} className={styles.attachmentRow}>
              <div className={styles.attachmentInfo}>
                <span className={styles.itemType} style={{ backgroundColor: '#ffd6e0' }}>
                  시험
                </span>
                <span
                  className={styles.subjectPill}
                  style={{ backgroundColor: exam.subjectColor ?? '#d7dee7' }}
                >
                  {exam.subjectName ?? '미지정'}
                </span>
                <span className={styles.attachmentName}>{exam.title}</span>
                <span className={styles.attachmentMeta}>{formatDueDate(exam.examAt)}</span>
              </div>
              <div className={styles.attachmentActions}>
                <button
                  type="button"
                  className={styles.filesIconButton}
                  onClick={() => onOpenExam(exam)}
                  aria-label={`${exam.title} 상세 열기`}
                >
                  <EditIcon className={styles.filesIcon} />
                </button>
              </div>
            </li>
          ))}

          {schedules.map((schedule) => (
            <li key={schedule.id} className={styles.attachmentRow}>
              <div className={styles.attachmentInfo}>
                <span className={styles.itemType} style={{ backgroundColor: '#9bb4c8' }}>
                  일정
                </span>
                <span
                  className={styles.subjectPill}
                  style={{ backgroundColor: schedule.subjectColor ?? '#d7dee7' }}
                >
                  {schedule.subjectName ?? '미지정'}
                </span>
                <span className={styles.attachmentName}>{schedule.title}</span>
                <span className={styles.attachmentMeta}>{formatDueDate(schedule.startsAt)}</span>
              </div>
              <div className={styles.attachmentActions}>
                <button
                  type="button"
                  className={styles.filesIconButton}
                  onClick={() => onOpenSchedule(schedule)}
                  aria-label={`${schedule.title} 상세 열기`}
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
  const { assignments, exams, schedules, subjects, storageSummary, isLoading, dataError, refreshAll } =
    useUserWorkspace()
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [isSubjectColorModalOpen, setIsSubjectColorModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEvent | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('all')
  const [isSaving, setIsSaving] = useState(false)
  const [previewingAssetId, setPreviewingAssetId] = useState<string | null>(null)
  const [previewAsset, setPreviewAsset] = useState<AssignmentAsset | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState<string | null>(null)
  const [attachmentsAssignment, setAttachmentsAssignment] = useState<Assignment | null>(null)
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null)
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null)
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduleEvent | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [dDayFilter, setDDayFilter] = useState<DDayFilter>('all')
  const [dDaySortMode, setDDaySortMode] = useState<DDaySortMode>('time')
  const [calendarMonth, setCalendarMonth] = useState(() => getInitialCalendarMonth(assignments))

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments])
  const filteredAssignments = useMemo(() => {
    if (itemTypeFilter !== 'all' && itemTypeFilter !== 'assignment') {
      return []
    }

    if (subjectFilter === 'all') {
      return sortedAssignments.filter((assignment) => matchesDDayFilter(assignment.dueDate, dDayFilter))
    }

    return sortedAssignments.filter(
      (assignment) => assignment.subjectId === subjectFilter && matchesDDayFilter(assignment.dueDate, dDayFilter),
    )
  }, [sortedAssignments, subjectFilter, itemTypeFilter, dDayFilter])

  const filteredExams = useMemo(() => {
    if (itemTypeFilter !== 'all' && itemTypeFilter !== 'exam') {
      return []
    }

    if (subjectFilter === 'all') {
      return exams.filter((exam) => matchesDDayFilter(exam.examAt, dDayFilter))
    }

    return exams.filter(
      (exam) => exam.subjectId === subjectFilter && matchesDDayFilter(exam.examAt, dDayFilter),
    )
  }, [exams, subjectFilter, itemTypeFilter, dDayFilter])

  const sortedExams = useMemo(() => {
    return [...filteredExams].sort((left, right) => {
      return new Date(left.examAt).getTime() - new Date(right.examAt).getTime()
    })
  }, [filteredExams])

  const filteredSchedules = useMemo(() => {
    if (itemTypeFilter !== 'all' && itemTypeFilter !== 'schedule') {
      return []
    }

    if (subjectFilter === 'all') {
      return schedules.filter((schedule) => matchesDDayFilter(schedule.startsAt, dDayFilter))
    }

    return schedules.filter(
      (schedule) => schedule.subjectId === subjectFilter && matchesDDayFilter(schedule.startsAt, dDayFilter),
    )
  }, [schedules, subjectFilter, itemTypeFilter, dDayFilter])

  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((left, right) => {
      return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
    })
  }, [filteredSchedules])

  const timelineRows = useMemo(() => {
    const assignmentRows: TimelineRow[] = filteredAssignments.map((assignment) => ({
      kind: 'assignment',
      sortDate: assignment.dueDate,
      isFavorite: assignment.isFavorite,
      assignment,
    }))
    const examRows: TimelineRow[] = sortedExams.map((exam) => ({
      kind: 'exam',
      sortDate: exam.examAt,
      isFavorite: exam.isFavorite,
      exam,
    }))
    const scheduleRows: TimelineRow[] = sortedSchedules.map((schedule) => ({
      kind: 'schedule',
      sortDate: schedule.startsAt,
      isFavorite: schedule.isFavorite,
      schedule,
    }))

    return [...assignmentRows, ...examRows, ...scheduleRows].sort((left, right) => {
      if (left.isFavorite !== right.isFavorite) {
        return Number(right.isFavorite) - Number(left.isFavorite)
      }

      if (dDaySortMode === 'dday') {
        const leftDiff = getDDayDiff(left.sortDate)
        const rightDiff = getDDayDiff(right.sortDate)
        const leftRank = leftDiff < 0 ? 3 : leftDiff === 0 ? 0 : leftDiff <= 3 ? 1 : 2
        const rightRank = rightDiff < 0 ? 3 : rightDiff === 0 ? 0 : rightDiff <= 3 ? 1 : 2

        if (leftRank !== rightRank) {
          return leftRank - rightRank
        }

        if (leftDiff < 0 && rightDiff < 0) {
          return rightDiff - leftDiff
        }

        if (leftDiff >= 0 && rightDiff >= 0) {
          return leftDiff - rightDiff
        }
      }

      return new Date(left.sortDate).getTime() - new Date(right.sortDate).getTime()
    })
  }, [filteredAssignments, sortedExams, sortedSchedules, dDaySortMode])

  const assignmentsByDate = useMemo(
    () => buildAssignmentsByDate(filteredAssignments),
    [filteredAssignments],
  )
  const examsByDate = useMemo(
    () => buildExamsByDate(sortedExams),
    [sortedExams],
  )
  const schedulesByDate = useMemo(
    () => buildSchedulesByDate(sortedSchedules),
    [sortedSchedules],
  )
  const calendarCells = useMemo(() => getCalendarCells(calendarMonth), [calendarMonth])
  const selectedDateAssignments = useMemo(() => {
    if (!selectedCalendarDate) {
      return []
    }

    return assignmentsByDate[getDateKey(selectedCalendarDate)] ?? []
  }, [assignmentsByDate, selectedCalendarDate])

  const selectedDateExams = useMemo(() => {
    if (!selectedCalendarDate) {
      return []
    }

    return examsByDate[getDateKey(selectedCalendarDate)] ?? []
  }, [examsByDate, selectedCalendarDate])

  const selectedDateSchedules = useMemo(() => {
    if (!selectedCalendarDate) {
      return []
    }

    return schedulesByDate[getDateKey(selectedCalendarDate)] ?? []
  }, [schedulesByDate, selectedCalendarDate])

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

  async function handleUpdateSubjectColor(subjectId: string, color: string) {
    setIsSaving(true)
    setError(null)

    const { error: updateError } = await updateSubjectColor(subjectId, color)
    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    setIsSubjectColorModalOpen(false)
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

  async function handleToggleExamFavorite(exam: Exam) {
    setIsSaving(true)
    setError(null)

    const { error: updateError } = await toggleExamFlags(exam.id, {
      isFavorite: !exam.isFavorite,
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await refreshAll()
  }

  async function handleToggleScheduleFavorite(schedule: ScheduleEvent) {
    setIsSaving(true)
    setError(null)

    const { error: updateError } = await toggleScheduleFlags(schedule.id, {
      isFavorite: !schedule.isFavorite,
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

  async function confirmDeleteExam() {
    if (!deletingExam) {
      return
    }

    setIsSaving(true)
    setError(null)
    const { error: deleteError } = await deleteExam(deletingExam.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    setDeletingExam(null)
    setIsSaving(false)
    await refreshAll()
  }

  async function confirmDeleteSchedule() {
    if (!deletingSchedule) {
      return
    }

    setIsSaving(true)
    setError(null)
    const { error: deleteError } = await deleteSchedule(deletingSchedule.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    setDeletingSchedule(null)
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

  function openEditExamModal(exam: Exam) {
    setEditingExam(exam)
    setSelectedCalendarDate(null)
    setIsExamModalOpen(true)
  }

  function openEditScheduleModal(schedule: ScheduleEvent) {
    setEditingSchedule(schedule)
    setSelectedCalendarDate(null)
    setIsScheduleModalOpen(true)
  }

  function openCalendarDay(cellDate: Date) {
    setSelectedCalendarDate(cellDate)
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

          <div className={styles.filterButtons}>
            <button
              type="button"
              className={
                itemTypeFilter === 'all'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setItemTypeFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              className={
                itemTypeFilter === 'assignment'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setItemTypeFilter('assignment')}
            >
              과제
            </button>
            <button
              type="button"
              className={
                itemTypeFilter === 'exam'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setItemTypeFilter('exam')}
            >
              시험
            </button>
            <button
              type="button"
              className={
                itemTypeFilter === 'schedule'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setItemTypeFilter('schedule')}
            >
              일정
            </button>
          </div>

          <div className={styles.filterButtons}>
            <button
              type="button"
              className={
                dDayFilter === 'all'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setDDayFilter('all')}
            >
              D-day 전체
            </button>
            <button
              type="button"
              className={
                dDayFilter === 'today'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setDDayFilter('today')}
            >
              오늘
            </button>
            <button
              type="button"
              className={
                dDayFilter === 'urgent'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setDDayFilter('urgent')}
            >
              D-3 이내
            </button>
            <button
              type="button"
              className={
                dDayFilter === 'past'
                  ? `${styles.filterButton} ${styles.filterButtonActive}`
                  : styles.filterButton
              }
              onClick={() => setDDayFilter('past')}
            >
              지난 일정
            </button>
          </div>

          <div className={styles.actions}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={
                  dDaySortMode === 'time'
                    ? `${styles.viewButton} ${styles.viewButtonActive}`
                    : styles.viewButton
                }
                onClick={() => setDDaySortMode('time')}
              >
                시간순
              </button>
              <button
                type="button"
                className={
                  dDaySortMode === 'dday'
                    ? `${styles.viewButton} ${styles.viewButtonActive}`
                    : styles.viewButton
                }
                onClick={() => setDDaySortMode('dday')}
              >
                임박순
              </button>
            </div>
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
            <button
              className={styles.ghostButton}
              type="button"
              onClick={() => setIsSubjectColorModalOpen(true)}
            >
              과목 색상
            </button>
            <button className={styles.primaryButton} type="button" onClick={openCreateModal}>
              과제 추가
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setEditingExam(null)
                setIsExamModalOpen(true)
              }}
            >
              시험 추가
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => {
                setEditingSchedule(null)
                setIsScheduleModalOpen(true)
              }}
            >
              일정 추가
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
                <col className={styles.colKind} />
                <col className={styles.colSubject} />
                <col className={styles.colTitle} />
                <col className={styles.colDueDate} />
                <col className={styles.colDday} />
                <col className={styles.colSubmitted} />
                <col className={styles.colLink} />
                <col className={styles.colFiles} />
                <col className={styles.colEdit} />
                <col className={styles.colDelete} />
              </colgroup>
              <thead>
                <tr>
                  <th>고정</th>
                  <th>종류</th>
                  <th>과목</th>
                  <th>과제명</th>
                  <th>마감일시</th>
                  <th>D-day</th>
                  <th>제출</th>
                  <th>링크</th>
                  <th>파일</th>
                  <th>수정</th>
                  <th aria-label="삭제" />
                </tr>
              </thead>
              <tbody>
                {!isLoading && timelineRows.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={11}>
                      현재 필터에 맞는 항목이 없습니다.
                    </td>
                  </tr>
                ) : null}

                {timelineRows.map((row) => {
                  if (row.kind === 'assignment') {
                    const { assignment } = row

                    return (
                      <tr key={`assignment-${assignment.id}`} className={getAssignmentRowClassName(assignment)}>
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
                          <span className={styles.subjectPill} style={{ backgroundColor: '#d7dee7' }}>
                            과제
                          </span>
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
                          <span>{assignment.title}</span>
                        </td>
                        <td className={assignment.submitted ? styles.dateCellSubmitted : styles.dateCell}>
                          {formatDueDate(assignment.dueDate)}
                        </td>
                        <td>
                          <span className={`${styles.dDayBadge} ${getDDayClassName(assignment.dueDate)}`}>
                            {formatDDay(assignment.dueDate)}
                          </span>
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
                    )
                  }

                  if (row.kind === 'exam') {
                    const { exam } = row
                    const isExamPinned = exam.isFavorite

                    return (
                      <tr key={`exam-${exam.id}`}>
                        <td>
                          <button
                            type="button"
                            className={isExamPinned ? styles.favoriteActive : styles.favoriteMuted}
                            onClick={() => void handleToggleExamFavorite(exam)}
                            disabled={isSaving}
                            aria-label={isExamPinned ? '고정 해제' : '맨 위로 고정'}
                          >
                            <PinIcon className={styles.pinIcon} />
                          </button>
                        </td>
                        <td>
                          <span className={styles.subjectPill} style={{ backgroundColor: '#ffd6e0' }}>
                            시험
                          </span>
                        </td>
                        <td>
                          <span className={styles.subjectPill} style={{ backgroundColor: exam.subjectColor ?? '#d7dee7' }}>
                            {exam.subjectName ?? '미지정'}
                          </span>
                        </td>
                        <td className={styles.titleCell}>
                          <div className={styles.titleStack}>
                            <span>{exam.title}</span>
                          </div>
                        </td>
                        <td className={styles.dateCell}>
                          {formatDueDate(exam.examAt)}
                        </td>
                        <td>
                          <span className={`${styles.dDayBadge} ${getDDayClassName(exam.examAt)}`}>
                            {formatDDay(exam.examAt)}
                          </span>
                        </td>
                        <td>
                          <span className={styles.helperInline}>-</span>
                        </td>
                        <td>
                          <span className={styles.helperInline}>-</span>
                        </td>
                        <td>
                          <span className={styles.helperInline}>-</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => openEditExamModal(exam)}
                            disabled={isSaving}
                            aria-label="시험 수정"
                          >
                            <EditIcon className={styles.editIcon} />
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => setDeletingExam(exam)}
                            disabled={isSaving}
                            aria-label="시험 삭제"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  }

                  const { schedule } = row
                  const isSchedulePinned = schedule.isFavorite

                  return (
                    <tr key={`schedule-${schedule.id}`}>
                      <td>
                        <button
                          type="button"
                          className={isSchedulePinned ? styles.favoriteActive : styles.favoriteMuted}
                          onClick={() => void handleToggleScheduleFavorite(schedule)}
                          disabled={isSaving}
                          aria-label={isSchedulePinned ? '고정 해제' : '맨 위로 고정'}
                        >
                          <PinIcon className={styles.pinIcon} />
                        </button>
                      </td>
                      <td>
                        <span className={styles.subjectPill} style={{ backgroundColor: '#9bb4c8' }}>
                          일정
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.subjectPill}
                          style={{ backgroundColor: schedule.subjectColor ?? '#d7dee7' }}
                        >
                          {schedule.subjectName ?? '미지정'}
                        </span>
                      </td>
                      <td className={styles.titleCell}>
                        <div className={styles.titleStack}>
                          <span>{schedule.title}</span>
                        </div>
                      </td>
                      <td className={styles.dateCell}>
                        {formatDueDate(schedule.startsAt)}
                      </td>
                      <td>
                        <span className={`${styles.dDayBadge} ${getDDayClassName(schedule.startsAt)}`}>
                          {formatDDay(schedule.startsAt)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.helperInline}>-</span>
                      </td>
                      <td>
                        <span className={styles.helperInline}>-</span>
                      </td>
                      <td>
                        <span className={styles.helperInline}>-</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => openEditScheduleModal(schedule)}
                          disabled={isSaving}
                          aria-label="일정 수정"
                        >
                          <EditIcon className={styles.editIcon} />
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => setDeletingSchedule(schedule)}
                          disabled={isSaving}
                          aria-label="일정 삭제"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <section className={styles.calendarPanel}>
            <div className={styles.calendarToolbar}>
              <button
                type="button"
                className={styles.calendarNavButton}
                aria-label="이전 달"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              >
                {'<'}
              </button>
              <h2 className={styles.calendarMonthLabel}>{formatMonthLabel(calendarMonth)}</h2>
              <button
                type="button"
                className={styles.calendarNavButton}
                aria-label="다음 달"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
              >
                {'>'}
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
                const dayExams = examsByDate[dateKey] ?? []
                const daySchedules = schedulesByDate[dateKey] ?? []
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
                    onClick={() => {
                      const hasItems = dayAssignments.length > 0 || dayExams.length > 0 || daySchedules.length > 0
                      if (hasItems) {
                        openCalendarDay(cellDate)
                      }
                    }}
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
                      {dayAssignments.map((assignment) => (
                        <button
                          key={assignment.id}
                          type="button"
                          className={
                            assignment.submitted
                              ? `${styles.calendarAssignment} ${styles.calendarAssignmentSubmitted}`
                              : styles.calendarAssignment
                          }
                          onClick={(e) => e.stopPropagation()}
                          title={assignment.title}
                        >
                          <span className={styles.calendarMarker} style={{ color: assignment.subjectColor ?? '#d7dee7' }}>●</span>
                        </button>
                      ))}

                      {dayExams.map((exam) => (
                        <button
                          key={exam.id}
                          type="button"
                          className={`${styles.calendarAssignment} ${styles.calendarAssignmentExam}`}
                          title={exam.title}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span
                            className={`${styles.calendarMarker} ${styles.calendarMarkerExam}`}
                            style={{ color: exam.subjectColor ?? '#d7dee7' }}
                          >
                            ★
                          </span>
                        </button>
                      ))}

                      {daySchedules.map((schedule) => (
                        <button
                          key={schedule.id}
                          type="button"
                          className={styles.calendarAssignment}
                          title={schedule.title}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className={styles.calendarMarker} style={{ color: schedule.subjectColor ?? schedule.color ?? '#9bb4c8' }}>◆</span>
                        </button>
                      ))}
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

      {isExamModalOpen ? (
        <ExamModal
          exam={editingExam}
          subjects={subjects}
          onClose={() => {
            setIsExamModalOpen(false)
            setEditingExam(null)
          }}
          onSaved={async () => {
            await refreshAll()
            setIsExamModalOpen(false)
            setEditingExam(null)
          }}
          isSaving={isSaving}
        />
      ) : null}

      {isScheduleModalOpen ? (
        <ScheduleModal
          schedule={editingSchedule}
          subjects={subjects}
          onClose={() => {
            setIsScheduleModalOpen(false)
            setEditingSchedule(null)
          }}
          onSaved={async () => {
            await refreshAll()
            setIsScheduleModalOpen(false)
            setEditingSchedule(null)
          }}
          isSaving={isSaving}
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

      {deletingExam ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              setDeletingExam(null)
            }
          }}
        >
          <section
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-exam-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteModalHeader}>
              <div>
                <h2 id="delete-exam-title" className={styles.deleteModalTitle}>
                  시험을 삭제할까요?
                </h2>
                <p className={styles.deleteModalDescription}>
                  <strong>{deletingExam.title}</strong> 시험을 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.deleteModalClose}
                onClick={() => setDeletingExam(null)}
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
                onClick={() => setDeletingExam(null)}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.deleteModalConfirm}
                onClick={() => void confirmDeleteExam()}
                disabled={isSaving}
              >
                삭제하기
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {deletingSchedule ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => {
            if (!isSaving) {
              setDeletingSchedule(null)
            }
          }}
        >
          <section
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-schedule-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.deleteModalHeader}>
              <div>
                <h2 id="delete-schedule-title" className={styles.deleteModalTitle}>
                  일정을 삭제할까요?
                </h2>
                <p className={styles.deleteModalDescription}>
                  <strong>{deletingSchedule.title}</strong> 일정을 삭제하면 복구할 수 없습니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.deleteModalClose}
                onClick={() => setDeletingSchedule(null)}
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
                onClick={() => setDeletingSchedule(null)}
                disabled={isSaving}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.deleteModalConfirm}
                onClick={() => void confirmDeleteSchedule()}
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

      {isSubjectColorModalOpen ? (
        <SubjectColorModal
          subjects={subjects}
          onClose={() => setIsSubjectColorModalOpen(false)}
          onUpdate={handleUpdateSubjectColor}
          isSaving={isSaving}
        />
      ) : null}

      {selectedCalendarDate ? (
        <CalendarDayModal
          date={selectedCalendarDate}
          assignments={selectedDateAssignments}
          exams={selectedDateExams}
          schedules={selectedDateSchedules}
          onClose={() => setSelectedCalendarDate(null)}
          onOpenAssignment={openEditModal}
          onOpenExam={openEditExamModal}
          onOpenSchedule={openEditScheduleModal}
        />
      ) : null}
    </>
  )
}
