import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristaPorId, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { listarGrupos, atribuirGrupo } from '../../services/grupos'
import { DynamicForm } from '../../components/DynamicForm'
import './EncontristaDetalhe.css'

export function EncontristaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { encontroId } = useEncontro()
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

  if (loading) return <AdminLayout><p className="text-secondary">Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/crm')} className="btn-back">
        ← Voltar ao CRM
      </button>

      <div className="encontrista-header">
        <div className="header-info">
          <h2 className="header-title">{encontrista.nome}</h2>
          <p className="header-phone">{encontrista.telefone}</p>
          {encontrista.checkin_at && (
            <div className="badge badge-success">
              <span>✓ Check-in: {new Date(encontrista.checkin_at).toLocaleString('pt-BR')}</span>
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
            value={encontrista.telefone}
            onChange={e => setEncontrista(prev => ({ ...prev, telefone: e.target.value }))}
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
    </AdminLayout>
  )
}
