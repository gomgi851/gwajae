import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const {
    isConfigured,
    isAuthenticated,
    isAuthorized,
    isAdmin,
    signInWithGoogle,
    signOut,
    user,
    accessMessage,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  useEffect(() => {
    if (!isAuthenticated || !isAuthorized) {
      return
    }

    const target = from ?? (isAdmin ? '/admin' : '/')
    void navigate(target, { replace: true })
  }, [from, isAdmin, isAuthenticated, isAuthorized, navigate])

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={styles.badge}>Gwajae</span>
        <h1 className={styles.title}>Private assignment space for your group</h1>
        <p className={styles.description}>
          Sign in with Google. Only allowed accounts can enter, and admin accounts can
          open the separate admin space.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void signInWithGoogle()}
            disabled={!isConfigured}
          >
            Continue with Google
          </button>
          {user ? (
            <button type="button" className={styles.secondaryButton} onClick={() => void signOut()}>
              Sign out
            </button>
          ) : null}
        </div>

        <div className={styles.infoBox}>
          <strong>Before this works</strong>
          <p>Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and run `supabase/setup.sql`.</p>
        </div>

        {isAuthenticated && !isAuthorized ? (
          <div className={styles.warningBox}>
            <strong>This account is signed in but not allowed yet.</strong>
            <p>{accessMessage ?? 'Ask an admin to add your email inside the admin panel.'}</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
