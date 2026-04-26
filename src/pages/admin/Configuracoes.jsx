import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontro, atualizarEncontro } from '../../services/encontros'
import './Configuracoes.css'

export function Configuracoes() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontro, setEncontro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvandoEncontro, setSalvandoEncontro] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    buscarEncontro(encontroId)
      .then(setEncontro)
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  async function handleSalvarEncontro(e) {
    e.preventDefault()
    setSalvandoEncontro(true)
    await atualizarEncontro(encontroId, {
      nome: encontro.nome,
      data_inicio: encontro.data_inicio || null,
      data_fim: encontro.data_fim || null,
      whatsapp_numero: encontro.whatsapp_numero,
      whatsapp_mensagem: encontro.whatsapp_mensagem,
    })
    setMensagem('Salvo!')
    setTimeout(() => setMensagem(null), 2000)
    setSalvandoEncontro(false)
  }

  const urlPreFicha = `${window.location.origin}/inscricao/${encontroId}`

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <h2 className="config-page-title">Configurações do Encontro</h2>

      {/* Dados do encontro */}
      <section className="config-section">
        <h3 className="config-section-title">DADOS DO ENCONTRO</h3>
        <form onSubmit={handleSalvarEncontro} className="config-form">
          <Campo label="Nome">
            <input
              value={encontro.nome}
              onChange={e => setEncontro(p => ({ ...p, nome: e.target.value }))}
              className="form-input"
            />
          </Campo>
          <div className="config-row-two">
            <Campo label="Data início">
              <input
                type="date"
                value={encontro.data_inicio ?? ''}
                onChange={e => setEncontro(p => ({ ...p, data_inicio: e.target.value }))}
                className="form-input"
              />
            </Campo>
            <Campo label="Data fim">
              <input
                type="date"
                value={encontro.data_fim ?? ''}
                onChange={e => setEncontro(p => ({ ...p, data_fim: e.target.value }))}
                className="form-input"
              />
            </Campo>
          </div>
          <Campo label="Número WhatsApp (com código do país, sem espaços)">
            <input
              placeholder="5511999990000"
              value={encontro.whatsapp_numero}
              onChange={e => setEncontro(p => ({ ...p, whatsapp_numero: e.target.value }))}
              className="form-input"
            />
          </Campo>
          <Campo label="Mensagem — use {nome} e {telefone}">
            <textarea
              value={encontro.whatsapp_mensagem}
              onChange={e => setEncontro(p => ({ ...p, whatsapp_mensagem: e.target.value }))}
              rows={3}
              className="form-textarea"
            />
          </Campo>
          {mensagem && <p className="config-success-message">{mensagem}</p>}
          <button type="submit" disabled={salvandoEncontro} className="btn btn-primary">
            {salvandoEncontro ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>

      {/* QR Code da pré-ficha */}
      <section className="config-section">
        <h3 className="config-section-title">QR CODE — PRÉ-FICHA</h3>
        <p className="config-url-text">{urlPreFicha}</p>
        <div className="config-qr-container">
          <QRCodeSVG value={urlPreFicha} size={160} />
        </div>
        <div className="config-qr-actions">
          <button
            onClick={() => navigator.clipboard.writeText(urlPreFicha)}
            className="btn btn-secondary"
          >
            Copiar link
          </button>
        </div>
      </section>
    </AdminLayout>
  )
}

function Campo({ label, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}
