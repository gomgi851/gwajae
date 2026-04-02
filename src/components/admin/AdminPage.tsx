import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useStorageUsage } from '../../hooks/useStorageUsage'
import { fetchAllowedUsers, inviteAllowedUser, updateAllowedUser } from '../../lib/allowedUsers'
import type { AllowedUser } from '../../types'
import { TopTabs } from '../common/TopTabs'
import styles from './AdminPage.module.css'

const adminTabs = [{ label: '관리자', to: '/admin' }]

function ProjectStorageCard({ usedMb, totalMb }: { usedMb: number; totalMb: number }) {
  const percentage = totalMb > 0 ? Math.min(100, Math.round((usedMb / totalMb) * 100)) : 0

  return (
    <section className={styles.storageCard}>
      <div>
        <p className={styles.storageLabel}>프로젝트 저장 공간</p>
        <h2 className={styles.storageTitle}>전체 업로드 사용량</h2>
      </div>
      <div className={styles.storageMeta}>
        <div className={styles.storageTrack} aria-hidden="true">
          <div className={styles.storageFill} style={{ width: `${percentage}%` }} />
        </div>
        <p className={styles.storageText}>
          {usedMb}MB / {totalMb / 1024}GB 사용 중
        </p>
      </div>
    </section>
  )
}

export function AdminPage() {
  const { user, signOut } = useAuth()
  const { totalUsedMb, totalLimitMb, error: storageError } = useStorageUsage()
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentEmail = user?.email?.toLowerCase() ?? ''

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
      setError('초대할 구글 이메일을 입력해 주세요.')
      return
    }

    const alreadyExists = allowedUsers.some((entry) => entry.email === normalizedEmail)
    if (alreadyExists) {
      setError('이미 허용 목록에 있는 이메일입니다.')
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
      setError('현재 로그인한 관리자 계정의 권한은 여기서 바꿀 수 없습니다.')
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
      setError('현재 로그인한 계정은 여기서 비활성화할 수 없습니다.')
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <TopTabs items={adminTabs} />
          <div className={styles.headerActions}>
            <Link className={styles.appLinkButton} to="/">
              일반 화면
            </Link>
            <button className={styles.signOutButton} type="button" onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <ProjectStorageCard usedMb={totalUsedMb} totalMb={totalLimitMb} />

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <h1 className={styles.title}>사용자 관리</h1>
              <p className={styles.subtitle}>{user?.email ?? '관리자 계정'}</p>
            </div>
            <div className={styles.inviteRow}>
              <input
                className={styles.input}
                type="email"
                placeholder="허용할 구글 이메일을 입력해 주세요"
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
                사용자 추가
              </button>
            </div>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}
          {storageError ? (
            <p className={styles.helperText}>
              이 저장공간 수치는 데이터베이스가 아니라, 사용자가 올린 첨부파일 총합 기준입니다.
            </p>
          ) : null}
          {isLoading ? <p className={styles.helperText}>허용 사용자 목록을 불러오는 중입니다...</p> : null}

          {!isLoading ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>상태</th>
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
                        {entry.role === 'admin' ? '관리자' : '일반'}
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
                        {entry.active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => void toggleRole(entry)}
                        disabled={isSaving || entry.email === currentEmail}
                      >
                        {entry.role === 'admin' ? '일반으로 변경' : '관리자로 변경'}
                      </button>
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
