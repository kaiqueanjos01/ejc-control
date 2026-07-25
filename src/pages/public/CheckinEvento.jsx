import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, PartyPopper } from 'lucide-react'
import { buscarEncontristasPorTelefone, confirmarCheckin, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia } from '../../utils/checkin'
import './Checkin.css'

export function CheckinEvento() {
  const { encontroId } = useParams()
  const [dia, setDia] = useState(1)
  const [telefone, setTelefone] = useState('')
  const [etapa, setEtapa] = useState('telefone') // telefone | escolher | confirmar | sucesso
  const [matches, setMatches] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [erro, setErro] = useState(null)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    buscarDiaAtivo(encontroId).then(setDia).catch(() => setDia(1))
  }, [encontroId])

  async function handleBuscar(e) {
    e.preventDefault()
    setErro(null)
    setProcessando(true)
    try {
      const encontrados = await buscarEncontristasPorTelefone(encontroId, telefone)
      if (encontrados.length === 0) {
        setErro('Não encontramos esse telefone. Confira e tente de novo.')
      } else if (encontrados.length === 1) {
        setSelecionado(encontrados[0])
        setEtapa('confirmar')
      } else {
        setMatches(encontrados)
        setEtapa('escolher')
      }
    } catch {
      setErro('Não foi possível consultar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  function escolher(encontrista) {
    setSelecionado(encontrista)
    setEtapa('confirmar')
  }

  async function handleConfirmar() {
    setErro(null)
    setProcessando(true)
    try {
      if (fezCheckinNoDia(selecionado, dia)) {
        setEtapa('sucesso')
        return
      }
      const atualizado = await confirmarCheckin(selecionado.id, dia)
      setSelecionado(atualizado)
      setEtapa('sucesso')
    } catch {
      setErro('Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const jaFeito = selecionado && fezCheckinNoDia(selecionado, dia)

  return (
    <div className="checkin-container">
      <div className="checkin-content">
        {etapa === 'telefone' && (
          <form className="checkin-form" onSubmit={handleBuscar}>
            <h1 className="checkin-title">Confirmar presença</h1>
            <p className="text-muted">Dia {dia} — informe seu telefone</p>
            <input
              className="checkin-input"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              autoFocus
            />
            {erro && <p className="checkin-error-message" role="alert">{erro}</p>}
            <button className="btn btn-primary" type="submit" disabled={processando}>
              {processando ? 'Buscando...' : 'Continuar'}
            </button>
          </form>
        )}

        {etapa === 'escolher' && (
          <div className="checkin-form">
            <h1 className="checkin-title">Quem é você?</h1>
            <p className="text-muted">Encontramos mais de uma pessoa com esse telefone.</p>
            <div className="checkin-escolha-lista">
              {matches.map((m) => (
                <button key={m.id} className="btn btn-secondary" onClick={() => escolher(m)}>
                  {m.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {etapa === 'confirmar' && selecionado && (
          <div className="checkin-form">
            <h1 className="checkin-title">{selecionado.nome}</h1>
            {selecionado.grupos && (
              <p className="checkin-grupo" style={{ '--gc': selecionado.grupos.cor }}>
                Grupo: <strong>{selecionado.grupos.nome}</strong>
              </p>
            )}
            {jaFeito ? (
              <p className="text-muted">Você já confirmou presença no Dia {dia}.</p>
            ) : (
              <p className="text-muted">Confirmar sua presença no Dia {dia}?</p>
            )}
            {erro && <p className="checkin-error-message" role="alert">{erro}</p>}
            <button className="btn btn-primary" onClick={handleConfirmar} disabled={processando}>
              {processando ? 'Confirmando...' : jaFeito ? 'Ver confirmação' : 'Confirmar presença'}
            </button>
          </div>
        )}

        {etapa === 'sucesso' && selecionado && (
          <div className="checkin-success">
            <div className="checkin-success-icon" aria-hidden="true">
              {jaFeito ? <CheckCircle2 size={64} strokeWidth={1.5} /> : <PartyPopper size={64} strokeWidth={1.5} />}
            </div>
            <h1 className="checkin-title">{selecionado.nome}</h1>
            <p className="checkin-success-message">Presença do Dia {dia} confirmada!</p>
            {selecionado.grupos && (
              <p className="checkin-grupo" style={{ '--gc': selecionado.grupos.cor }}>
                Seu grupo: <strong>{selecionado.grupos.nome}</strong>
              </p>
            )}
          </div>
        )}

        {etapa !== 'telefone' && etapa !== 'sucesso' && (
          <button className="checkin-voltar" onClick={() => { setEtapa('telefone'); setErro(null) }}>
            ← Voltar
          </button>
        )}
      </div>
    </div>
  )
}
