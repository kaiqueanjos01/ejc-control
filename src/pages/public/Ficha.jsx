import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { buscarEncontristaPorToken, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { DynamicForm } from '../../components/DynamicForm'
import './Ficha.css'

export function Ficha() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [secoes, setSecoes] = useState([]) // [{ nome, campos }]
  const [valores, setValores] = useState({})
  const [etapa, setEtapa] = useState(0)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        const c = await listarCampos(e.encontro_id)
        const camposVisiveis = c.filter(campo => campo.visivel_encontrista)

        // Agrupar por seção mantendo a ordem de inserção
        const mapa = new Map()
        for (const campo of camposVisiveis) {
          const nome = campo.secao || 'Geral'
          if (!mapa.has(nome)) mapa.set(nome, [])
          mapa.get(nome).push(campo)
        }
        const secoesAgrupadas = [...mapa.entries()].map(([nome, campos]) => ({ nome, campos }))

        setEncontrista(e)
        setSecoes(secoesAgrupadas)
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
    if (etapa < secoes.length - 1) {
      setEtapa(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
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
          <h2 className="ficha-success-title"><CheckCircle2 size={28} /> Ficha salva!</h2>
          <p>Obrigado, {encontrista.nome}. Até o encontro!</p>
        </div>
      </Tela>
    )
  }

  const totalSecoes = secoes.length
  const secaoAtual = secoes[etapa]
  const multiStep = totalSecoes > 1

  return (
    <Tela>
      <div className="card ficha-card">
        <h2 className="ficha-greeting">Olá, {encontrista.nome}!</h2>
        <p className="ficha-subtitle">Complete sua ficha de inscrição.</p>

        {multiStep && (
          <div className="ficha-progress">
            <div className="ficha-progress-steps">
              {secoes.map((s, i) => (
                <div
                  key={s.nome}
                  className={`ficha-step ${i < etapa ? 'done' : ''} ${i === etapa ? 'active' : ''}`}
                >
                  <div className="ficha-step-dot">
                    {i < etapa ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  <span className="ficha-step-label">{s.nome}</span>
                </div>
              ))}
            </div>
            <div className="ficha-progress-bar">
              <div
                className="ficha-progress-fill"
                style={{ width: `${(etapa / (totalSecoes - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {secaoAtual ? (
          <form onSubmit={handleSubmit} className="ficha-form">
            {multiStep && <h3 className="ficha-secao-title">{secaoAtual.nome}</h3>}
            <DynamicForm campos={secaoAtual.campos} valores={valores} onChange={setValores} />
            {erro && <p className="form-error">{erro}</p>}
            <div className="ficha-form-nav">
              {etapa > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setEtapa(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
              )}
              <button type="submit" disabled={salvando} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
                {etapa < totalSecoes - 1
                  ? <><span>Próximo</span> <ChevronRight size={14} /></>
                  : salvando ? 'Salvando...' : 'Salvar ficha'
                }
              </button>
            </div>
          </form>
        ) : (
          <p className="text-muted">Nenhum campo adicional por enquanto.</p>
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
