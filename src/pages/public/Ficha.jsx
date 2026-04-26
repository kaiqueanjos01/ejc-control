import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { DynamicForm } from '../../components/DynamicForm'
import './Ficha.css'

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
  if (erro && !encontrista) return <Tela><p className="text-danger">Erro: {erro}</p></Tela>

  if (salvo) {
    return (
      <Tela>
        <div className="ficha-success">
          <h2 className="ficha-success-title">Ficha salva! ✓</h2>
          <p>Obrigado, {encontrista.nome}. Até o encontro!</p>
        </div>
      </Tela>
    )
  }

  return (
    <Tela>
      <div className="card ficha-card">
        <h2 className="ficha-greeting">Olá, {encontrista.nome}!</h2>
        <p className="ficha-subtitle">Complete sua ficha de inscrição.</p>
        {campos.length === 0 ? (
          <p className="text-muted">Nenhum campo adicional por enquanto.</p>
        ) : (
          <form onSubmit={handleSubmit} className="ficha-form">
            <DynamicForm campos={campos} valores={valores} onChange={setValores} />
            {erro && <p className="form-error">{erro}</p>}
            <button type="submit" disabled={salvando} className="btn btn-primary btn-full">
              {salvando ? 'Salvando...' : 'Salvar ficha'}
            </button>
          </form>
        )}
      </div>
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div className="ficha-container">
      <div className="ficha-content">{children}</div>
    </div>
  )
}
