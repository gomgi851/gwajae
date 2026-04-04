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
        <h1 className={styles.title}>둘이 함께 쓰는 과제 관리 공간</h1>
        <p className={styles.description}>
          구글 계정으로 로그인해 과제와 첨부 파일을 관리해 보세요. 허용된 이메일만 들어올 수 있고,
          관리자 계정은 별도의 관리자 공간도 사용할 수 있습니다.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void signInWithGoogle()}
            disabled={!isConfigured}
          >
            Google로 로그인
          </button>
          {user ? (
            <button type="button" className={styles.secondaryButton} onClick={() => void signOut()}>
              로그아웃
            </button>
          ) : null}
        </div>

        <div className={styles.infoBox}>
          <strong>처음 한 번만 필요해요</strong>
          <p>
            <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>를 설정하고
            <code> supabase/setup.sql</code>을 실행해 주세요.
          </p>
        </div>

        {isAuthenticated && !isAuthorized ? (
          <div className={styles.warningBox}>
            <strong>로그인은 되었지만 아직 허용되지 않은 계정입니다.</strong>
            <p>{accessMessage ?? '관리자 페이지에서 이 이메일을 허용 목록에 추가해 주세요.'}</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
