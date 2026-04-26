import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristasPorNome, atualizarEncontrista } from '../../services/encontristas'
import './CheckinAdmin.css'

export function CheckinAdmin() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [processando, setProcessando] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  async function handleBusca(e) {
    const valor = e.target.value
    setBusca(valor)
    if (valor.length < 2) { setResultados([]); return }
    if (!encontroId) { navigate('/admin'); return }
    setBuscando(true)
    const res = await buscarEncontristasPorNome(encontroId, valor)
    setResultados(res)
    setBuscando(false)
  }

  async function handleCheckin(encontrista) {
    if (encontrista.checkin_at) return
    setProcessando(encontrista.id)
    await atualizarEncontrista(encontrista.id, { checkin_at: new Date().toISOString() })
    setResultados(prev =>
      prev.map(e => e.id === encontrista.id ? { ...e, checkin_at: new Date().toISOString() } : e)
    )
    setMensagem(`Check-in de ${encontrista.nome} confirmado!`)
    setTimeout(() => setMensagem(null), 3000)
    setProcessando(null)
  }

  return (
    <AdminLayout>
      <div className="checkin-container">
        <h5 className="checkin-header">Check-in Manual</h5>

        <input
          className="form-input checkin-search"
          placeholder="Buscar encontrista pelo nome..."
          value={busca}
          onChange={handleBusca}
          autoFocus
        />

        {mensagem && (
          <div className="alert alert-success">
            <div className="alert-icon">✓</div>
            <div className="alert-content">
              <p className="alert-message">{mensagem}</p>
            </div>
          </div>
        )}

        {buscando && <p className="loading-text">Buscando...</p>}

        <div className="results-container">
          {resultados.map(e => {
            const grupo = e.grupos
            return (
              <div key={e.id} className="result-row">
                <div className="result-info">
                  <div className="result-name">{e.nome}</div>
                  <div className="result-phone">{e.telefone}</div>
                  {grupo && (
                    <div className="result-group" style={{ color: grupo.cor }}>
                      ● {grupo.nome}
                    </div>
                  )}
                </div>
                <div className="result-actions">
                  {e.checkin_at ? (
                    <span className="badge badge-success">
                      ✓ Feito
                    </span>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleCheckin(e)}
                      disabled={processando === e.id}
                    >
                      {processando === e.id ? '...' : 'Check-in'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {busca.length >= 2 && !buscando && resultados.length === 0 && (
          <p className="empty-state">Nenhum encontrista encontrado para "{busca}".</p>
        )}
      </div>
    </AdminLayout>
  )
}
