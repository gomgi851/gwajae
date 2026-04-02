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
        title="Supabase 설정이 필요합니다"
        description="Google 로그인을 쓰려면 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 먼저 넣어 주세요."
      />
    )
  }

  if (isLoading) {
    return (
      <FullPageMessage
        title="로그인 확인 중"
        description="현재 Google 로그인 세션을 확인하고 있습니다."
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
          <h1>아직 접근이 허용되지 않았습니다</h1>
          <p>{accessMessage ?? '관리자에게 허용 이메일 목록에 추가해 달라고 요청해 주세요.'}</p>
          <button className={styles.actionButton} onClick={() => void signOut()} type="button">
            로그아웃
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
        title="Supabase 설정이 필요합니다"
        description="관리자 공간을 열기 전에 Supabase 연결과 관리자 이메일 설정이 먼저 필요합니다."
      />
    )
  }

  if (isLoading) {
    return (
      <FullPageMessage
        title="권한 확인 중"
        description="이 계정이 관리자 공간에 접근할 수 있는지 확인하고 있습니다."
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAuthorized) {
    return (
      <FullPageMessage
        title="아직 접근이 허용되지 않았습니다"
        description={accessMessage ?? '먼저 관리자에게 이메일 추가를 요청해 주세요.'}
      />
    )
  }

  if (!isAdmin) {
    return (
      <FullPageMessage
        title="관리자 전용 화면입니다"
        description="이 화면은 allowed_users 테이블에서 admin 역할을 가진 계정만 사용할 수 있습니다."
      />
    )
  }

  return <>{children}</>
}
