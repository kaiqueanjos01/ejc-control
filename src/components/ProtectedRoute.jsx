import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>
  if (!session) return <Navigate to="/admin/login" replace />

  return children
}
