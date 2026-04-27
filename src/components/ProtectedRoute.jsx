import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdminRole } from '../hooks/useAdminRole'
import { verificarPermissao } from '../services/adminUsers'

export function ProtectedRoute({ children, requiredPermission }) {
  const { session, loading } = useAuth()
  const { adminUser, loading: roleLoading } = useAdminRole()

  if (loading || (requiredPermission && roleLoading)) {
    return <div style={{ padding: 24 }}>Carregando...</div>
  }
  if (!session) return <Navigate to="/admin/login" replace />
  if (requiredPermission && !adminUser) return <Navigate to="/admin" replace />

  if (requiredPermission && adminUser && !verificarPermissao(adminUser, requiredPermission)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
