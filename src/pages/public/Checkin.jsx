import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, fazerCheckin } from '../../services/encontristas'

export function Checkin() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [jaFeito, setJaFeito] = useState(false)

  useEffect(() => {
    async function processar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        if (e.checkin_at) {
          setEncontrista(e)
          setJaFeito(true)
          setLoading(false)
          return
        }
        const atualizado = await fazerCheckin(token)
        setEncontrista(atualizado)
      } catch {
        setErro('QR code inválido ou encontrista não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    processar()
  }, [token])

  if (loading) {
    return (
      <Tela>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p>Processando check-in...</p>
      </Tela>
    )
  }

  if (erro) {
    return (
      <Tela>
        <div style={{ fontSize: 48 }}>❌</div>
        <p style={{ color: '#f87171' }}>{erro}</p>
      </Tela>
    )
  }

  const grupo = encontrista?.grupos
  const corGrupo = grupo?.cor ?? '#6b7280'

  return (
    <Tela>
      <div style={{ fontSize: 56, marginBottom: 8 }}>{jaFeito ? '✅' : '🎉'}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        {jaFeito ? 'Check-in já realizado' : 'Check-in confirmado!'}
      </h1>
      <p style={{ fontSize: 18, color: '#ccc', marginBottom: 20 }}>{encontrista?.nome}</p>
      {grupo && (
        <div style={{
          background: corGrupo + '22',
          border: `2px solid ${corGrupo}`,
          borderRadius: 12,
          padding: '12px 24px',
          display: 'inline-block',
          color: corGrupo,
          fontWeight: 700,
          fontSize: 16,
        }}>
          {grupo.nome}
        </div>
      )}
      {!grupo && (
        <p style={{ color: '#aaa', fontSize: 14 }}>Grupo ainda não atribuído</p>
      )}
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
    }}>
      {children}
    </div>
  )
}
