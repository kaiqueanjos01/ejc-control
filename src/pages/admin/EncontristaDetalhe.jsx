import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, Trash2, X } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristaPorId, atualizarEncontrista, excluirEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { listarGrupos, atribuirGrupo } from '../../services/grupos'
import { DynamicForm } from '../../components/DynamicForm'
import { applyMask, stripMask } from '../../utils/masks'
import { useAdminRole } from '../../hooks/useAdminRole'
import './EncontristaDetalhe.css'

export function EncontristaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { encontroId } = useEncontro()
  const { role } = useAdminRole()
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [encontrista, setEncontrista] = useState(null)
  const [campos, setCampos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    async function carregar() {
      const [e, c, g] = await Promise.all([
        buscarEncontristaPorId(id),
        listarCampos(encontroId),
        listarGrupos(encontroId),
      ])
      setEncontrista(e)
      setCampos(c)
      setGrupos(g)
      setValores(e.dados_extras ?? {})
      setLoading(false)
    }
    carregar()
  }, [id, encontroId])

  async function handleSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    await atualizarEncontrista(id, {
      nome: encontrista.nome,
      telefone: encontrista.telefone,
      dados_extras: valores,
    })
    setMensagem('Salvo com sucesso!')
    setTimeout(() => setMensagem(null), 2000)
    setSalvando(false)
  }

  async function handleGrupo(grupoId) {
    await atribuirGrupo(id, grupoId || null)
    const atualizado = await buscarEncontristaPorId(id)
    setEncontrista(atualizado)
  }

  function copiarLinkCheckin() {
    navigator.clipboard.writeText(`${window.location.origin}/checkin/${encontrista.token}`)
    setMensagem('Link de check-in copiado!')
    setTimeout(() => setMensagem(null), 2000)
  }

  async function handleExcluirEncontrista() {
    setExcluindo(true)
    try {
      await excluirEncontrista(id)
      navigate('/admin/crm')
    } catch (err) {
      setMensagem('Erro ao excluir: ' + err.message)
      setExcluindo(false)
      setConfirmandoExclusao(false)
    }
  }

  if (loading) return <AdminLayout><p className="text-secondary">Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/crm')} className="btn-back">
        <ChevronLeft size={16} /> Voltar ao CRM
      </button>

      <div className="encontrista-header">
        <div className="header-info">
          <h2 className="header-title">{encontrista.nome}</h2>
          <p className="header-phone">{applyMask(encontrista.telefone ?? '', 'phone')}</p>
          {encontrista.checkin_dia1_at && (
            <div className="badge badge-success">
              <Check size={11} /> Dia 1: {new Date(encontrista.checkin_dia1_at).toLocaleString('pt-BR')}
            </div>
          )}
          {encontrista.checkin_dia2_at && (
            <div className="badge badge-success">
              <Check size={11} /> Dia 2: {new Date(encontrista.checkin_dia2_at).toLocaleString('pt-BR')}
            </div>
          )}
        </div>
        <button onClick={copiarLinkCheckin} className="btn btn-secondary btn-sm">
          QR Check-in
        </button>
      </div>

      <div className="grupo-section">
        <label className="form-label">Atribuir Grupo</label>
        <div className="grupo-buttons">
          <button
            onClick={() => handleGrupo(null)}
            className={`grupo-btn ${!encontrista.grupo_id ? 'active' : ''}`}
          >
            ◯ Sem grupo
          </button>
          {grupos.map(g => (
            <button
              key={g.id}
              onClick={() => handleGrupo(g.id)}
              className={`grupo-btn ${encontrista.grupo_id === g.id ? 'active' : ''}`}
              style={{ '--grupo-color': g.cor }}
            >
              ● {g.nome}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSalvar} className="encontrista-form">
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input
            type="text"
            className="form-input"
            value={encontrista.nome}
            onChange={e => setEncontrista(prev => ({ ...prev, nome: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Telefone</label>
          <input
            type="tel"
            className="form-input"
            value={applyMask(encontrista.telefone ?? '', 'phone')}
            onChange={e => setEncontrista(prev => ({ ...prev, telefone: stripMask(e.target.value) }))}
          />
        </div>

        {campos.length > 0 && (
          <DynamicForm campos={campos} valores={valores} onChange={setValores} />
        )}

        {mensagem && (
          <div className="alert alert-success">
            <p className="alert-message">{mensagem}</p>
          </div>
        )}

        <button type="submit" disabled={salvando} className="btn btn-primary btn-full">
          {salvando ? 'Salvando...' : 'Salvar Encontrista'}
        </button>
      </form>

      {role === 'admin' && (
        <div className="delete-section">
          <button
            type="button"
            className="btn btn-danger btn-full"
            onClick={() => setConfirmandoExclusao(true)}
          >
            <Trash2 size={14} /> Excluir encontrista
          </button>
        </div>
      )}

      {confirmandoExclusao && (
        <div className="detalhe-modal-overlay" onClick={() => !excluindo && setConfirmandoExclusao(false)}>
          <div className="detalhe-modal" onClick={e => e.stopPropagation()}>
            <div className="detalhe-modal-header">
              <h3>Excluir encontrista</h3>
              <button
                className="detalhe-modal-close"
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
              >
                <X size={16} />
              </button>
            </div>
            <p className="detalhe-modal-text">
              Tem certeza que deseja excluir <strong>{encontrista?.nome}</strong>?{' '}
              Essa ação não pode ser desfeita.
            </p>
            <div className="detalhe-modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleExcluirEncontrista}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
