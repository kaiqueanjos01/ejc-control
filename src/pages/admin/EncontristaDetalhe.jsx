import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristaPorId, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { listarGrupos, atribuirGrupo } from '../../services/grupos'
import { DynamicForm } from '../../components/DynamicForm'

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
    setMensagem('Salvo!')
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

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/crm')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: 16, fontSize: 13 }}>
        ← Voltar ao CRM
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{encontrista.nome}</h2>
          <p style={{ color: '#aaa', fontSize: 13, marginTop: 2 }}>{encontrista.telefone}</p>
          {encontrista.checkin_at && (
            <p style={{ color: '#52b788', fontSize: 12, marginTop: 4 }}>
              ✓ Check-in: {new Date(encontrista.checkin_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <button onClick={copiarLinkCheckin} style={btnSecStyle}>QR Check-in</button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>Grupo</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleGrupo(null)}
            style={{ ...grupoBtn, borderColor: !encontrista.grupo_id ? '#fff' : '#333' }}
          >
            Sem grupo
          </button>
          {grupos.map(g => (
            <button
              key={g.id}
              onClick={() => handleGrupo(g.id)}
              style={{ ...grupoBtn, borderColor: encontrista.grupo_id === g.id ? g.cor : '#333', color: g.cor }}
            >
              ● {g.nome}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Nome</label>
          <input
            value={encontrista.nome}
            onChange={e => setEncontrista(prev => ({ ...prev, nome: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Telefone</label>
          <input
            value={encontrista.telefone}
            onChange={e => setEncontrista(prev => ({ ...prev, telefone: e.target.value }))}
            style={inputStyle}
          />
        </div>
        {campos.length > 0 && (
          <DynamicForm campos={campos} valores={valores} onChange={setValores} />
        )}
        {mensagem && <p style={{ color: '#52b788', fontSize: 13 }}>{mensagem}</p>}
        <button type="submit" disabled={salvando} style={btnStyle}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </AdminLayout>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #333', background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const btnStyle = {
  padding: '11px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer',
}
const grupoBtn = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid',
  background: 'none', fontSize: 13, cursor: 'pointer', color: '#e0e0e0',
}
