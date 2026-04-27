import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, Users, CheckSquare, Settings,
  Moon, Sun, Menu, LogOut, FileText, UsersRound, DollarSign
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEncontro } from '../hooks/useEncontro'
import { verificarPermissao, ROLE_LABELS } from '../services/adminUsers'
import '../styles/AdminLayout.css'

export function AdminLayout({ children }) {
  const navigate = useNavigate()
  const { setEncontroId } = useEncontro()
  const { session } = useAuth()
  const { adminUser } = useAdminRole()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('ejc-theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ejc-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  function trocarEncontro() {
    setEncontroId(null)
    navigate('/admin')
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  const allNavItems = [
    { to: '/admin/crm', label: 'CRM', icon: <BarChart2 size={16} />, permission: 'canViewCRM' },
    { to: '/admin/grupos', label: 'Grupos', icon: <Users size={16} />, permission: 'canViewGrupos' },
    { to: '/admin/checkin', label: 'Check-in', icon: <CheckSquare size={16} />, permission: 'canViewCheckin' },
    { to: '/admin/formulario', label: 'Formulário', icon: <FileText size={16} />, permission: 'canViewFormulario' },
    { to: '/admin/equipe', label: 'Equipe', icon: <UsersRound size={16} />, permission: 'canViewEquipe' },
    { to: '/admin/financeiro', label: 'Financeiro', icon: <DollarSign size={16} />, permission: 'canViewFinanceiro' },
    { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={16} />, permission: 'canViewFormulario' },
  ]

  const navItems = adminUser
    ? allNavItems.filter((item) => verificarPermissao(adminUser, item.permission))
    : []

  const getUserInitial = () => {
    return (adminUser?.nome || session?.user?.email || '?').charAt(0).toUpperCase()
  }

  const getUserEmail = () => {
    return session?.user?.email || ''
  }

  return (
    <div className="admin-layout">
      {/* Overlay */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <button
            className="admin-sidebar-logo"
            onClick={trocarEncontro}
            title="Voltar para seleção de encontros"
          >
            EJC
          </button>
          <div>
            <div className="admin-sidebar-name">EJC Control</div>
            <div className="admin-sidebar-env">Painel Admin</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {(adminUser || session) && (
            <div className="admin-user-info">
              <div className="admin-user-avatar">{getUserInitial()}</div>
              <div className="admin-user-details">
                <div className="admin-user-email">{getUserEmail()}</div>
                {adminUser?.role && (
                  <div className="admin-user-role">
                    {ROLE_LABELS[adminUser.role] ?? adminUser.role}
                    {adminUser.is_coord && (
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.75 }}>· Coord</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="admin-sidebar-actions">
            <button onClick={toggleTheme} className="admin-theme-btn" title="Alternar tema">
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <button onClick={handleLogout} className="admin-logout-btn" title="Sair">
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Body */}
      <div className="admin-body">
        {/* Mobile topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-brand">
            <button className="admin-topbar-logo" onClick={trocarEncontro}>EJC</button>
            <span className="admin-topbar-name">EJC Control</span>
          </div>
          <div className="admin-topbar-actions">
            <button onClick={toggleTheme} className="admin-theme-btn btn-icon" title="Alternar tema">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              title="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  )
}
