import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import styles from './AuthGuard.module.css'

function FullPageMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.statePage}>
      <div className={styles.stateCard}>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

export function UserGuard({ children }: PropsWithChildren) {
  const { isConfigured, isLoading, isAuthenticated, isAuthorized, accessMessage, signOut } =
    useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <FullPageMessage
        title="Supabase Setup Needed"
        description="Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to start Google login."
      />
    )
  }

  if (isLoading) {
    return (
      <FullPageMessage
        title="Checking Session"
        description="Looking for your Google login session."
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthorized) {
    return (
      <div className={styles.statePage}>
        <div className={styles.stateCard}>
          <h1>Access Not Yet Allowed</h1>
          <p>{accessMessage ?? 'Ask an admin to add your email to the allowed user list.'}</p>
          <button className={styles.actionButton} onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AdminGuard({ children }: PropsWithChildren) {
  const { isConfigured, isLoading, isAuthenticated, isAuthorized, isAdmin, accessMessage } =
    useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <FullPageMessage
        title="Supabase Setup Needed"
        description="Connect Supabase and add admin emails before opening the admin space."
      />
    )
  }

  if (isLoading) {
    return (
      <FullPageMessage
        title="Checking Access"
        description="Confirming whether this account can open the admin space."
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthorized) {
    return (
      <FullPageMessage
        title="Access Not Yet Allowed"
        description={accessMessage ?? 'Ask an admin to add your email first.'}
      />
    )
  }

  if (!isAdmin) {
    return (
      <FullPageMessage
        title="Admin Access Only"
        description="This screen is reserved for accounts with the admin role in allowed_users."
      />
    )
  }

  return <>{children}</>
}
