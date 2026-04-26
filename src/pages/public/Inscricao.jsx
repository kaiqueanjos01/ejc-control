import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontro } from '../../services/encontros'
import { criarEncontrista } from '../../services/encontristas'
import { buildWhatsAppUrl } from '../../utils/whatsapp'

export function Inscricao() {
  const { encontroId } = useParams()
  const [encontro, setEncontro] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
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
  if (erro && !encontro) return <Tela><p style={{ color: '#f87171' }}>{erro}</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <h2 style={{ color: '#52b788' }}>Enviado! ✓</h2>
        <p>Redirecionando para o WhatsApp...</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{encontro.nome}</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>Preencha seus dados para participar</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Seu nome completo"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="WhatsApp com DDD (ex: 11 99999-0000)"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          inputMode="tel"
          required
          style={inputStyle}
        />
        {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
        <button type="submit" disabled={enviando} style={btnStyle}>
          {enviando ? 'Enviando...' : 'Quero participar →'}
        </button>
      </form>
      <p style={{ fontSize: 11, color: '#555', marginTop: 16, textAlign: 'center' }}>
        Após enviar, você receberá um contato pelo WhatsApp.
      </p>
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

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #333', background: '#1a1a1a', color: '#e0e0e0', fontSize: 15,
}

const btnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
