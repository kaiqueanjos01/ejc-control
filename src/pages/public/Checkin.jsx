import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, fazerCheckin } from '../../services/encontristas'
import './Checkin.css'

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
      <div className="checkin-container">
        <div className="checkin-loading">
          <div className="checkin-spinner" role="status" aria-label="Carregando">
            <span className="sr-only">Processando check-in...</span>
          </div>
          <p className="text-muted">Processando check-in...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="checkin-container">
        <div className="checkin-content">
          <div className="checkin-error">
            <div className="checkin-error-icon" aria-hidden="true">❌</div>
            <p className="checkin-error-message" role="alert">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  const grupo = encontrista?.grupos
  const corGrupo = grupo?.cor ?? 'var(--gray-500)'

  return (
    <div className="checkin-container">
      <div className="checkin-content">
        <div className="checkin-icon" aria-hidden="true">{jaFeito ? '✅' : '🎉'}</div>
        <h1 className="checkin-title">
          {jaFeito ? 'Check-in já realizado' : 'Check-in confirmado!'}
        </h1>
        <p className="checkin-name">{encontrista?.nome}</p>
        {grupo && (
          <div
            className="checkin-group-card"
            style={{
              backgroundColor: corGrupo + '15',
              borderColor: corGrupo,
              color: corGrupo
            }}
          >
            {grupo.nome}
          </div>
        )}
        {!grupo && (
          <p className="checkin-no-group">Grupo ainda não atribuído</p>
        )}
      </div>
    </div>
  )
}
