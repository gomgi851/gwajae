import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { TopTabs } from '../common/TopTabs'
import styles from './UserShell.module.css'

const userTabs = [
  { label: 'Home', to: '/' },
  { label: 'Assignments', to: '/assignments' },
]

export function UserShell() {
  const { user, isAdmin, signOut } = useAuth()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <TopTabs items={userTabs} />
          <div className={styles.accountRow}>
            <span className={styles.accountEmail}>{user?.email}</span>
            {isAdmin ? (
              <a className={styles.adminLink} href="/admin">
                Admin space
              </a>
            ) : null}
            <button className={styles.signOutButton} type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
