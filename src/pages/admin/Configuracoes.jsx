import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminLayout } from '../../components/AdminLayout'
import AdminUsersManager from '../../components/AdminUsersManager'
import { useEncontro } from '../../hooks/useEncontro'
import { useAdminRole } from '../../hooks/useAdminRole'
import { buscarEncontro, atualizarEncontro } from '../../services/encontros'
import { listarCampos, criarCampo, removerCampo, reordenarCampos } from '../../services/campos'
import './Configuracoes.css'

export function Configuracoes() {
  const { encontroId } = useEncontro()
  const { role } = useAdminRole()
  const navigate = useNavigate()
  const [encontro, setEncontro] = useState(null)
  const [campos, setCampos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvandoEncontro, setSalvandoEncontro] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [novoCampo, setNovoCampo] = useState({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
  const [adicionandoCampo, setAdicionandoCampo] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([buscarEncontro(encontroId), listarCampos(encontroId)])
      .then(([e, c]) => { setEncontro(e); setCampos(c) })
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

  async function handleAdicionarCampo(e) {
    e.preventDefault()
    const chave = novoCampo.chave || novoCampo.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const campo = await criarCampo({
      encontro_id: encontroId,
      label: novoCampo.label,
      chave,
      tipo: novoCampo.tipo,
      obrigatorio: novoCampo.obrigatorio,
      visivel_encontrista: novoCampo.visivel_encontrista,
      visivel_equipe: novoCampo.visivel_equipe,
      ordem: campos.length,
    })
    setCampos(prev => [...prev, campo])
    setNovoCampo({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
    setAdicionandoCampo(false)
  }

  async function handleRemoverCampo(id) {
    if (!confirm('Remover este campo? Os dados já preenchidos em dados_extras não serão apagados.')) return
    await removerCampo(id)
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  async function handleMoverCampo(index, direcao) {
    const novo = [...campos]
    const alvo = index + direcao
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    const comOrdem = novo.map((c, i) => ({ ...c, ordem: i }))
    setCampos(comOrdem)
    await reordenarCampos(comOrdem.map(c => ({ id: c.id, ordem: c.ordem })))
  }

  const urlPreFicha = `${window.location.origin}/inscricao/${encontroId}`

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <h2 className="config-page-title">Configurações do Encontro</h2>

      {/* Gerenciar Admins - Apenas para Admins */}
      {role === 'admin' && <AdminUsersManager />}

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

      {/* Construtor de formulário */}
      <section>
        <div className="config-section-header">
          <h3 className="config-section-title">CAMPOS DO FORMULÁRIO</h3>
          <button onClick={() => setAdicionandoCampo(true)} className="btn btn-primary">+ Campo</button>
        </div>

        {adicionandoCampo && (
          <form onSubmit={handleAdicionarCampo} className="config-add-field-form">
            <div className="config-field-inputs">
              <input
                placeholder="Label (ex: Data de Nascimento)"
                value={novoCampo.label}
                onChange={e => setNovoCampo(p => ({ ...p, label: e.target.value }))}
                required
                className="form-input config-field-label-input"
              />
              <select
                value={novoCampo.tipo}
                onChange={e => setNovoCampo(p => ({ ...p, tipo: e.target.value }))}
                className="form-select config-field-type-select"
              >
                <option value="text">Texto</option>
                <option value="date">Data</option>
                <option value="phone">Telefone</option>
                <option value="number">Número</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            <div className="config-field-checkboxes">
              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  checked={novoCampo.obrigatorio}
                  onChange={e => setNovoCampo(p => ({ ...p, obrigatorio: e.target.checked }))}
                />
                Obrigatório
              </label>
              <label className="config-checkbox-label">
                <input
                  type="checkbox"
                  checked={novoCampo.visivel_encontrista}
                  onChange={e => setNovoCampo(p => ({ ...p, visivel_encontrista: e.target.checked }))}
                />
                Visível ao encontrista
              </label>
            </div>
            <div className="config-form-actions">
              <button type="submit" className="btn btn-primary">Adicionar</button>
              <button type="button" onClick={() => setAdicionandoCampo(false)} className="btn btn-secondary">Cancelar</button>
            </div>
          </form>
        )}

        {campos.length === 0 && !adicionandoCampo && (
          <p className="config-empty-state">Nenhum campo adicional. Clique em "+ Campo" para adicionar.</p>
        )}

        <div className="config-fields-list">
          {campos.map((campo, i) => (
            <div key={campo.id} className="config-field-item">
              <div className="config-field-info">
                <span className="config-field-label">{campo.label}</span>
                <span className="config-field-type">{campo.tipo}</span>
                {campo.obrigatorio && <span className="config-field-required">*obrigatório</span>}
                {campo.visivel_encontrista && <span className="config-field-visibility">encontrista</span>}
              </div>
              <div className="config-field-actions">
                <button
                  onClick={() => handleMoverCampo(i, -1)}
                  disabled={i === 0}
                  className="config-icon-btn"
                  aria-label="Mover para cima"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoverCampo(i, 1)}
                  disabled={i === campos.length - 1}
                  className="config-icon-btn"
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleRemoverCampo(campo.id)}
                  className="config-icon-btn config-icon-btn--danger"
                  aria-label="Remover campo"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
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

