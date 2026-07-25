import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, PartyPopper, XCircle } from 'lucide-react'
import { buscarEncontristaPorToken, confirmarCheckin, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia } from '../../utils/checkin'
import './Checkin.css'

export function Checkin() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [jaFeito, setJaFeito] = useState(false)
  const [dia, setDia] = useState(1)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        const diaAtivo = await buscarDiaAtivo(e.encontro_id)
        setDia(diaAtivo)
        setEncontrista(e)
        setJaFeito(fezCheckinNoDia(e, diaAtivo))
      } catch {
        setErro('QR code inválido ou encontrista não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [token])

  async function handleConfirmar() {
    setProcessando(true)
    try {
      const atualizado = await confirmarCheckin(encontrista.id, dia)
      setEncontrista(atualizado)
      setJaFeito(true)
    } catch {
      setErro('Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  if (loading) {
    return (
      <div className="checkin-container">
        <div className="checkin-loading">
          <div className="checkin-spinner" role="status" aria-label="Carregando">
            <span className="sr-only">Carregando...</span>
          </div>
          <p className="text-muted">Carregando...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="checkin-container">
        <div className="checkin-content">
          <div className="checkin-error">
            <div className="checkin-error-icon" aria-hidden="true"><XCircle size={64} strokeWidth={1.5} /></div>
            <p className="checkin-error-message" role="alert">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  const grupo = encontrista?.grupos

  return (
    <div className="checkin-container">
      <div className="checkin-content">
        {!jaFeito ? (
          <div className="checkin-form">
            <div className="checkin-icon" aria-hidden="true">
              <PartyPopper size={72} strokeWidth={1.5} />
            </div>
            <h1 className="checkin-title">{encontrista.nome}</h1>
            {grupo && (
              <p className="checkin-grupo" style={{ '--gc': grupo.cor }}>
                Grupo: <strong>{grupo.nome}</strong>
              </p>
            )}
            <button className="btn btn-primary" onClick={handleConfirmar} disabled={processando}>
              {processando ? 'Confirmando...' : `Confirmar presença no Dia ${dia}`}
            </button>
          </div>
        ) : (
          <div className="checkin-success">
            <div className="checkin-success-icon" aria-hidden="true"><CheckCircle2 size={72} strokeWidth={1.5} /></div>
            <h1 className="checkin-title">{encontrista.nome}</h1>
            <p className="checkin-success-message">Presença do Dia {dia} confirmada!</p>
            {grupo && (
              <p className="checkin-grupo" style={{ '--gc': grupo.cor }}>
                Seu grupo: <strong>{grupo.nome}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
