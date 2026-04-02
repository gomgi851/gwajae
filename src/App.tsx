import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { AdminGuard, UserGuard } from './components/auth/AuthGuard'
import { LoginPage } from './components/auth/LoginPage'
import { AdminPage } from './components/admin/AdminPage'
import { AssignmentsPage } from './components/user/AssignmentsPage'
import { HomePage } from './components/user/HomePage'
import { UserShell } from './components/user/UserShell'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <UserGuard>
                <UserShell />
              </UserGuard>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminPage />
              </AdminGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
