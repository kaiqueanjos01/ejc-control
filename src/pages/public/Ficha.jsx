import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { DynamicForm } from '../../components/DynamicForm'

export function Ficha() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [campos, setCampos] = useState([])
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        const c = await listarCampos(e.encontro_id)
        setEncontrista(e)
        setCampos(c.filter(campo => campo.visivel_encontrista))
        setValores(e.dados_extras ?? {})
      } catch {
        setErro('Link inválido ou expirado.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await atualizarEncontrista(encontrista.id, { dados_extras: valores })
      setSalvo(true)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <Tela><p>Carregando...</p></Tela>
  if (erro && !encontrista) return <Tela><p style={{ color: '#f87171' }}>{erro}</p></Tela>

  if (salvo) {
    return (
      <Tela>
        <h2 style={{ color: '#52b788' }}>Ficha salva! ✓</h2>
        <p>Obrigado, {encontrista.nome}. Até o encontro!</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Olá, {encontrista.nome}!</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>Complete sua ficha de inscrição.</p>
      {campos.length === 0 ? (
        <p style={{ color: '#aaa' }}>Nenhum campo adicional por enquanto.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DynamicForm campos={campos} valores={valores} onChange={setValores} />
          {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
          <button type="submit" disabled={salvando} style={btnStyle}>
            {salvando ? 'Salvando...' : 'Salvar ficha'}
          </button>
        </form>
      )}
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
    </div>
  )
}

const btnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
