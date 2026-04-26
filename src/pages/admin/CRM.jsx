import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'

export function CRM() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    listarEncontristas(encontroId)
      .then(setEncontristas)
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  const filtrados = encontristas.filter(e => {
    const matchBusca = e.nome.toLowerCase().includes(busca.toLowerCase())
    if (filtro === 'sem_grupo') return matchBusca && !e.grupo_id
    if (filtro === 'sem_checkin') return matchBusca && !e.checkin_at
    if (filtro === 'sem_ficha') return matchBusca && Object.keys(e.dados_extras ?? {}).length === 0
    return matchBusca
  })

  function copiarLinkFicha(token) {
    const url = `${window.location.origin}/ficha/${token}`
    navigator.clipboard.writeText(url)
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>CRM — {encontristas.length} encontristas</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={inputStyle}>
          <option value="todos">Todos</option>
          <option value="sem_grupo">Sem grupo</option>
          <option value="sem_checkin">Sem check-in</option>
          <option value="sem_ficha">Sem ficha completa</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p style={{ color: '#555' }}>Nenhum encontrista encontrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map(e => (
            <div key={e.id} style={rowStyle}>
              <div onClick={() => navigate(`/admin/crm/${e.id}`)} style={{ flex: 1, cursor: 'pointer' }}>
                <span style={{ fontWeight: 500 }}>{e.nome}</span>
                <span style={{ fontSize: 12, color: '#777', marginLeft: 10 }}>{e.telefone}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {e.grupos && (
                  <span style={{ fontSize: 11, color: e.grupos.cor, fontWeight: 600 }}>
                    ● {e.grupos.nome}
                  </span>
                )}
                {e.checkin_at && <span style={{ fontSize: 11, color: '#52b788' }}>✓ Check-in</span>}
                <button
                  onClick={() => copiarLinkFicha(e.token)}
                  style={{ background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}
                >
                  📋 Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 13,
}
const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
  borderRadius: 8, border: '1px solid #222', background: '#111',
}
