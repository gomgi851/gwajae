import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { TopTabs } from '../common/TopTabs'
import styles from './UserShell.module.css'

const userTabs = [
  { label: '홈', to: '/' },
  { label: '과제 관리', to: '/assignments' },
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
                관리자 공간
              </a>
            ) : null}
            <button className={styles.signOutButton} type="button" onClick={() => void signOut()}>
              로그아웃
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
