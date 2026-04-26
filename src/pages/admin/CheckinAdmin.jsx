import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Search } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas, atualizarEncontrista } from '../../services/encontristas'
import './CheckinAdmin.css'

export function CheckinAdmin() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    listarEncontristas(encontroId)
      .then(setEncontristas)
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    if (!q) return encontristas
    return encontristas.filter(e =>
      e.nome.toLowerCase().includes(q) || e.telefone.includes(q)
    )
  }, [encontristas, busca])

  const totalFeito = encontristas.filter(e => e.checkin_at).length

  async function handleCheckin(encontrista) {
    if (encontrista.checkin_at) return
    setProcessando(encontrista.id)
    await atualizarEncontrista(encontrista.id, { checkin_at: new Date().toISOString() })
    setEncontristas(prev =>
      prev.map(e => e.id === encontrista.id ? { ...e, checkin_at: new Date().toISOString() } : e)
    )
    setProcessando(null)
  }

  return (
    <AdminLayout>
      <div className="checkin-page-header">
        <div>
          <h2 className="checkin-page-title">Check-in Manual</h2>
          <p className="checkin-page-subtitle">Confirme a presença dos participantes</p>
        </div>
        <div className="checkin-counters">
          <div className="checkin-counter">
            <span className="checkin-counter-value">{totalFeito}</span>
            <span className="checkin-counter-label">Confirmados</span>
          </div>
          <div className="checkin-counter checkin-counter--total">
            <span className="checkin-counter-value">{encontristas.length}</span>
            <span className="checkin-counter-label">Total</span>
          </div>
        </div>
      </div>

      <div className="checkin-search-wrapper">
        <Search size={15} className="checkin-search-icon" />
        <input
          className="checkin-search-input"
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          autoFocus
        />
      </div>

      {loading ? (
        <div className="checkin-loading">
          <div className="spinner" />
          <p>Carregando...</p>
        </div>
      ) : (
        <div className="checkin-table-wrapper">
          <table className="checkin-table">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Telefone</th>
                <th>Grupo</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="checkin-table-empty">
                    {busca ? `Nenhum resultado para "${busca}"` : 'Nenhum participante cadastrado'}
                  </td>
                </tr>
              ) : (
                filtrados.map(e => {
                  const feito = !!e.checkin_at
                  return (
                    <tr key={e.id} className={feito ? 'row-done' : ''}>
                      <td>
                        <span className="checkin-name">{e.nome}</span>
                      </td>
                      <td className="checkin-phone">{e.telefone}</td>
                      <td>
                        {e.grupos ? (
                          <span className="checkin-group-badge" style={{ '--gc': e.grupos.cor }}>
                            {e.grupos.nome}
                          </span>
                        ) : (
                          <span className="checkin-no-group">—</span>
                        )}
                      </td>
                      <td>
                        {feito ? (
                          <span className="badge badge-success"><Check size={10} /> Confirmado</span>
                        ) : (
                          <span className="badge badge-neutral">Pendente</span>
                        )}
                      </td>
                      <td>
                        {!feito && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCheckin(e)}
                            disabled={processando === e.id}
                          >
                            {processando === e.id ? '...' : <><Check size={12} /> Check-in</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
