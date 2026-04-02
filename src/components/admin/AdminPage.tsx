import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useI18n } from '../../i18n/useI18n'
import { useStorageUsage } from '../../hooks/useStorageUsage'
import {
  deleteAllowedUser,
  fetchAllowedUsers,
  inviteAllowedUser,
  updateAllowedUser,
} from '../../lib/allowedUsers'
import type { AllowedUser } from '../../types'
import { TopTabs } from '../common/TopTabs'
import styles from './AdminPage.module.css'

const adminTabs = [{ label: '관리자', to: '/admin' }]
const USER_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024
const SUPER_ADMIN_EMAIL = 'yoonggee95@gmail.com'

function ProjectStorageCard({ usedMb, totalMb }: { usedMb: number; totalMb: number }) {
  const percentage = totalMb > 0 ? Math.min(100, Math.round((usedMb / totalMb) * 100)) : 0

  return (
    <section className={styles.storageCard}>
      <div>
        <p className={styles.storageLabel}>{labels.projectStorage}</p>
        <h2 className={styles.storageTitle}>{labels.totalUploadUsage}</h2>
      </div>
      <div className={styles.storageMeta}>
        <div className={styles.storageTrack} aria-hidden="true">
          <div className={styles.storageFill} style={{ width: `${percentage}%` }} />
        </div>
        <p className={styles.storageText}>
          {labels.storageUsed
            .replace('{used}', String(usedMb))
            .replace('{total}', String(totalMb / 1024))}
        </p>
      </div>
    </section>
  )
}

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

function UserStorageCell({ entry }: { entry: AllowedUser }) {
  const usageBytes = entry.usageBytes ?? 0
  const limitBytes = entry.usageLimitBytes ?? USER_STORAGE_LIMIT_BYTES
  const usageMb = bytesToMegabytes(usageBytes)
  const limitMb = bytesToMegabytes(limitBytes)
  const percentage = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0

  const toneClass =
    usageMb >= 95
      ? styles.usageDanger
      : usageMb >= 80
        ? styles.usageWarning
        : styles.usageNormal

  return (
    <div className={styles.usageCell}>
      <div className={styles.usageMetaRow}>
        <span className={styles.usageText}>
          {usageMb}MB / {limitMb}MB
        </span>
        <span className={styles.usagePercent}>{percentage}%</span>
      </div>
      <div className={styles.usageTrack} aria-hidden="true">
        <div className={`${styles.usageFill} ${toneClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export function AdminPage() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const { totalUsedMb, totalLimitMb, error: storageError } = useStorageUsage()
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentEmail = user?.email?.toLowerCase() ?? ''
  const isSuperAdmin = currentEmail === SUPER_ADMIN_EMAIL

  const adminTabs = [{ label: t.tabs.admin, to: '/admin' }]

  async function loadAllowedUsers(options?: { keepLoadingState?: boolean }) {
    if (!options?.keepLoadingState) {
      setIsLoading(true)
    }
    setError(null)

    const { data, error: queryError } = await fetchAllowedUsers()

    if (queryError) {
      setError(queryError.message)
      setAllowedUsers([])
      setIsLoading(false)
      return
    }

    setAllowedUsers(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadAllowedUsers({ keepLoadingState: true })
    })
  }, [])

  async function handleInvite() {
    const normalizedEmail = inviteEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setError(t.admin.inviteRequired)
      return
    }

    const alreadyExists = allowedUsers.some((entry) => entry.email === normalizedEmail)
    if (alreadyExists) {
      setError(t.admin.alreadyExists)
      return
    }

    setIsSaving(true)
    setError(null)

    const { error: inviteError } = await inviteAllowedUser(normalizedEmail, 'member')

    if (inviteError) {
      setError(inviteError.message)
      setIsSaving(false)
      return
    }

    setInviteEmail('')
    setIsSaving(false)
    await loadAllowedUsers()
  }

  async function toggleRole(entry: AllowedUser) {
    if (entry.email === currentEmail) {
      setError('현재 로그인한 관리자 계정의 권한은 여기서 변경할 수 없습니다.')
      return
    }

    setIsSaving(true)
    setError(null)

    const nextRole = entry.role === 'admin' ? 'member' : 'admin'
    const { error: updateError } = await updateAllowedUser(entry.id, { role: nextRole })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await loadAllowedUsers()
  }

  async function toggleActive(entry: AllowedUser) {
    if (entry.email === currentEmail) {
      setError(t.admin.cannotDeactivateSelf)
      return
    }

    setIsSaving(true)
    setError(null)

    const { error: updateError } = await updateAllowedUser(entry.id, {
      active: !entry.active,
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await loadAllowedUsers()
  }

  async function handleDelete(entry: AllowedUser) {
    if (!isSuperAdmin) {
      setError('사용자 삭제는 메인 관리자 계정에서만 할 수 있습니다.')
      return
    }

    if (entry.email === currentEmail) {
      setError('현재 로그인한 메인 관리자 계정은 삭제할 수 없습니다.')
      return
    }

    setIsSaving(true)
    setError(null)

    const { error: deleteError } = await deleteAllowedUser(entry.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    await loadAllowedUsers()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <TopTabs items={adminTabs} />
          <div className={styles.headerActions}>
            <Link className={styles.appLinkButton} to="/">
              {t.auth.normalView}
            </Link>
            <button className={styles.signOutButton} type="button" onClick={() => void signOut()}>
              {t.auth.signOut}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <ProjectStorageCard usedMb={totalUsedMb} totalMb={totalLimitMb} labels={t.admin} />

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <h1 className={styles.title}>{t.admin.userManagement}</h1>
              <p className={styles.subtitle}>{user?.email ?? t.admin.adminAccount}</p>
            </div>
            <div className={styles.inviteRow}>
              <input
                className={styles.input}
                type="email"
                placeholder="허용할 구글 이메일을 입력해 주세요."
                aria-label="초대할 사용자 이메일"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              <button
                className={styles.inviteButton}
                type="button"
                onClick={() => void handleInvite()}
                disabled={isSaving}
              >
                {t.admin.addUser}
              </button>
            </div>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}
          {storageError ? (
            <p className={styles.helperText}>
              이 사용량은 데이터베이스가 아니라 사용자가 올린 첨부 파일 기준으로 계산됩니다.
            </p>
          ) : null}
          {isLoading ? <p className={styles.helperText}>{t.admin.loading}</p> : null}

          {!isLoading ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>상태</th>
                  <th>사용량</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allowedUsers.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.email}</td>
                    <td>
                      <button
                        className={
                          entry.role === 'admin' ? styles.adminBadgeButton : styles.memberBadgeButton
                        }
                        type="button"
                        onClick={() => void toggleRole(entry)}
                        disabled={isSaving || entry.email === currentEmail}
                      >
                        {entry.role === 'admin' ? t.admin.admin : t.admin.member}
                      </button>
                    </td>
                    <td>
                      <button
                        className={entry.active ? styles.statusButtonActive : styles.statusButtonInactive}
                        type="button"
                        onClick={() => void toggleActive(entry)}
                        disabled={isSaving || entry.email === currentEmail}
                      >
                        <span className={styles.statusDot} />
                        {entry.active ? t.admin.active : t.admin.inactive}
                      </button>
                    </td>
                    <td>
                      <UserStorageCell entry={entry} />
                    </td>
                    <td>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => void toggleRole(entry)}
                        disabled={isSaving || entry.email === currentEmail}
                      >
                        {entry.role === 'admin' ? t.admin.changeToMember : t.admin.changeToAdmin}
                      </button>
                      {isSuperAdmin ? (
                        <button
                          className={styles.deleteButton}
                          type="button"
                          onClick={() => void handleDelete(entry)}
                          disabled={isSaving || entry.email === currentEmail}
                        >
                          사용자 삭제
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </main>
    </div>
  )
}
