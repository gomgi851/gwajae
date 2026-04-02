import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { projectUsage } from '../../data/mockData'
import { useAuth } from '../../auth/useAuth'
import { fetchAllowedUsers, inviteAllowedUser, updateAllowedUser } from '../../lib/allowedUsers'
import type { AllowedUser } from '../../types'
import { TopTabs } from '../common/TopTabs'
import styles from './AdminPage.module.css'

const adminTabs = [{ label: 'Admin', to: '/admin' }]

function ProjectStorageCard() {
  const percentage = Math.round((projectUsage.used / projectUsage.total) * 100)

  return (
    <section className={styles.storageCard}>
      <div>
        <p className={styles.storageLabel}>Project Storage</p>
        <h2 className={styles.storageTitle}>Group Total Usage</h2>
      </div>
      <div className={styles.storageMeta}>
        <div className={styles.storageTrack} aria-hidden="true">
          <div className={styles.storageFill} style={{ width: `${percentage}%` }} />
        </div>
        <p className={styles.storageText}>
          {projectUsage.used}MB of {projectUsage.total / 1000}GB used
        </p>
      </div>
    </section>
  )
}

export function AdminPage() {
  const { user, signOut } = useAuth()
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
      setError('Enter a Google email before inviting a user.')
      return
    }

    const alreadyExists = allowedUsers.some((entry) => entry.email === normalizedEmail)
    if (alreadyExists) {
      setError('That email is already on the allowed user list.')
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
      setError('You cannot change your own admin role from this screen.')
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
      setError('You cannot disable your own admin account from this screen.')
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
        <TopTabs items={adminTabs} />
      </header>

      <main className={styles.main}>
        <ProjectStorageCard />

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <h1 className={styles.title}>User Management</h1>
              <p className={styles.subtitle}>{user?.email ?? 'Admin account'}</p>
            </div>
            <div className={styles.sideControls}>
              <div className={styles.inviteRow}>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="Enter google email..."
                  aria-label="Invite user email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <button
                  className={styles.inviteButton}
                  type="button"
                  onClick={() => void handleInvite()}
                  disabled={isSaving}
                >
                  Invite User
                </button>
              </div>
              <Link className={styles.appLinkButton} to="/">
                Open app
              </Link>
              <button className={styles.signOutButton} type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}
          {isLoading ? <p className={styles.helperText}>Loading allowed users...</p> : null}

          {!isLoading ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Status</th>
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
                        {entry.role === 'admin' ? 'Admin' : 'Member'}
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
                        {entry.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => void toggleRole(entry)}
                        disabled={isSaving || entry.email === currentEmail}
                      >
                        {entry.role === 'admin' ? 'Make member' : 'Make admin'}
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
