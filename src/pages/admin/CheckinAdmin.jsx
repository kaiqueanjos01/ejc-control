import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Search, QrCode, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas, atualizarEncontrista, definirDiaAtivo, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia, colunaDoDia } from '../../utils/checkin'
import './CheckinAdmin.css'

export function CheckinAdmin() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)
  const [dia, setDia] = useState(1)
  const [mostrarQr, setMostrarQr] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([listarEncontristas(encontroId), buscarDiaAtivo(encontroId)])
      .then(([lista, diaAtivo]) => {
        setEncontristas(lista)
        setDia(diaAtivo)
      })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    if (!q) return encontristas
    return encontristas.filter(e =>
      e.nome.toLowerCase().includes(q) || e.telefone.includes(q)
    )
  }, [encontristas, busca])

  const totalFeito = encontristas.filter((e) => fezCheckinNoDia(e, dia)).length
  const urlAutoCheckin = `${window.location.origin}/checkin-evento/${encontroId}`

  async function trocarDia(novoDia) {
    setDia(novoDia)
    await definirDiaAtivo(encontroId, novoDia)
  }

  async function handleCheckin(encontrista) {
    if (fezCheckinNoDia(encontrista, dia)) return
    setProcessando(encontrista.id)
    const coluna = colunaDoDia(dia)
    const agora = new Date().toISOString()
    await atualizarEncontrista(encontrista.id, { [coluna]: agora })
    setEncontristas((prev) =>
      prev.map((e) => (e.id === encontrista.id ? { ...e, [coluna]: agora } : e))
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

      <div className="checkin-day-selector">
        <div className="checkin-day-tabs" role="tablist">
          <button
            className={`checkin-day-tab ${dia === 1 ? 'active' : ''}`}
            onClick={() => trocarDia(1)}
          >
            Dia 1
          </button>
          <button
            className={`checkin-day-tab ${dia === 2 ? 'active' : ''}`}
            onClick={() => trocarDia(2)}
          >
            Dia 2
          </button>
        </div>
        <span className="checkin-day-hint">QR registrando: <strong>Dia {dia}</strong></span>
        <button className="btn btn-secondary btn-sm checkin-qr-toggle" onClick={() => setMostrarQr((v) => !v)}>
          <QrCode size={14} /> {mostrarQr ? 'Ocultar QR' : 'QR de auto-check-in'}
        </button>
      </div>

      {mostrarQr && (
        <div className="checkin-qr-panel" id="checkin-qr-print">
          <div className="checkin-qr-card">
            <h3>Auto-check-in do encontro</h3>
            <p className="checkin-qr-instru">Aponte a câmera do celular para o QR e informe seu telefone.</p>
            <QRCodeSVG value={urlAutoCheckin} size={220} />
            <p className="checkin-qr-url">{urlAutoCheckin}</p>
            <button className="btn btn-primary btn-sm checkin-qr-print-btn" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      )}

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
                  const feito = fezCheckinNoDia(e, dia)
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
