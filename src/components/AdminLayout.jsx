import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEncontro } from '../hooks/useEncontro'

export function AdminLayout({ children }) {
  const navigate = useNavigate()
  const { encontroId, setEncontroId } = useEncontro()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  function trocarEncontro() {
    setEncontroId(null)
    navigate('/admin')
  }

  const navItems = [
    { to: '/admin/crm', label: 'CRM' },
    { to: '/admin/grupos', label: 'Grupos' },
    { to: '/admin/checkin', label: 'Check-in' },
    { to: '/admin/configuracoes', label: 'Config' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '0 16px', display: 'flex', alignItems: 'center', gap: 4, height: 48,
      }}>
        <button onClick={trocarEncontro} style={{ background: 'none', border: 'none', color: '#52b788', fontWeight: 700, cursor: 'pointer', fontSize: 14, marginRight: 12 }}>
          EJC
        </button>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              padding: '6px 10px', borderRadius: 6, fontSize: 13, color: isActive ? '#fff' : '#888',
              background: isActive ? '#222' : 'transparent', textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>
          Sair
        </button>
      </nav>
      <main style={{ flex: 1, padding: 20, maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
