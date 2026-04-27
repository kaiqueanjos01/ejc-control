import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { buscarEncontro } from '../../services/encontros'
import { criarEncontrista } from '../../services/encontristas'
import { buildWhatsAppUrl } from '../../utils/whatsapp'
import { useMaskInput } from '../../hooks/useMaskInput'
import './Inscricao.css'

export function Inscricao() {
  const { encontroId } = useParams()
  const [encontro, setEncontro] = useState(null)
  const [nome, setNome] = useState('')
  const { inputValue: telDisplay, handleChange: handleTelChange, rawValue: telefone } = useMaskInput('phone')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    buscarEncontro(encontroId)
      .then(setEncontro)
      .catch(() => setErro('Encontro não encontrado.'))
      .finally(() => setLoading(false))
  }, [encontroId])

  async function handleSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await criarEncontrista({ encontroId, nome: nome.trim(), telefone: telefone.trim() })
      setSucesso(true)
      const url = buildWhatsAppUrl({
        numero: encontro.whatsapp_numero,
        template: encontro.whatsapp_mensagem,
        nome: nome.trim(),
        telefone: telefone.trim(),
      })
      window.location.href = url
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
      setEnviando(false)
    }
  }

  if (loading) return <Tela><p>Carregando...</p></Tela>
  if (erro && !encontro) return <Tela><p className="text-danger">{erro}</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <h2 className="text-success"><CheckCircle2 size={32} /> Enviado!</h2>
        <p>Redirecionando para o WhatsApp...</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <div className="card inscricao-card">
        <h1 className="inscricao-title">{encontro.nome}</h1>
        <p className="inscricao-subtitle">Preencha seus dados para participar</p>

        <form onSubmit={handleSubmit} className="inscricao-form">
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Seu nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="WhatsApp com DDD (ex: 11 99999-0000)"
              value={telDisplay}
              onChange={handleTelChange}
              inputMode="tel"
              required
            />
          </div>

          {erro && <p className="form-error">{erro}</p>}

          <button type="submit" disabled={enviando} className="btn btn-primary btn-full inscricao-btn">
            {enviando ? 'Enviando...' : 'Quero participar →'}
          </button>
        </form>

        <p className="inscricao-footer">
          Após enviar, você receberá um contato pelo WhatsApp.
        </p>
      </div>
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div className="inscricao-container">
      <div className="inscricao-content">{children}</div>
    </div>
  )
}
