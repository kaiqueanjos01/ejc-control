import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEncontro } from '../hooks/useEncontro'
import '../styles/AdminLayout.css'

export function AdminLayout({ children }) {
  const navigate = useNavigate()
  const { encontroId, setEncontroId } = useEncontro()
  const { session } = useAuth()
  const { adminUser } = useAdminRole()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  function trocarEncontro() {
    setEncontroId(null)
    navigate('/admin')
  }

  const navItems = [
    { to: '/admin/crm', label: 'CRM', icon: '📊' },
    { to: '/admin/grupos', label: 'Grupos', icon: '👥' },
    { to: '/admin/checkin', label: 'Check-in', icon: '✓' },
    { to: '/admin/configuracoes', label: 'Config', icon: '⚙️' },
  ]

  const getUserInitial = () => {
    return session?.user?.email?.charAt(0).toUpperCase() || '?'
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <nav className="admin-navbar">
          <div className="admin-brand">
            <button
              onClick={trocarEncontro}
              className="admin-brand-logo"
              title="Voltar para seleção de encontros"
            >
              EJC
            </button>
            {encontroId && (
              <span className="admin-brand-text">Seletor</span>
            )}
          </div>

          <div className="admin-nav-items">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="admin-nav-actions">
            {adminUser && (
              <div className="admin-user-info">
                <div className="admin-user-avatar" title={adminUser.role}>
                  {getUserInitial()}
                </div>
                <div className="admin-user-role">
                  {adminUser.role}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="admin-logout-btn"
              title="Fazer logout"
            >
              Sair
            </button>
          </div>
        </nav>
      </header>

      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}
