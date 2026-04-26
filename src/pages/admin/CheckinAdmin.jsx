import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristasPorNome, atualizarEncontrista } from '../../services/encontristas'

export function CheckinAdmin() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [processando, setProcessando] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  async function handleBusca(e) {
    const valor = e.target.value
    setBusca(valor)
    if (valor.length < 2) { setResultados([]); return }
    if (!encontroId) { navigate('/admin'); return }
    setBuscando(true)
    const res = await buscarEncontristasPorNome(encontroId, valor)
    setResultados(res)
    setBuscando(false)
  }

  async function handleCheckin(encontrista) {
    if (encontrista.checkin_at) return
    setProcessando(encontrista.id)
    await atualizarEncontrista(encontrista.id, { checkin_at: new Date().toISOString() })
    setResultados(prev =>
      prev.map(e => e.id === encontrista.id ? { ...e, checkin_at: new Date().toISOString() } : e)
    )
    setMensagem(`Check-in de ${encontrista.nome} confirmado!`)
    setTimeout(() => setMensagem(null), 3000)
    setProcessando(null)
  }

  return (
    <AdminLayout>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Check-in Manual</h2>

      <input
        placeholder="Buscar encontrista pelo nome..."
        value={busca}
        onChange={handleBusca}
        autoFocus
        style={{ ...inputStyle, width: '100%', marginBottom: 16 }}
      />

      {mensagem && (
        <div style={{ background: '#1a3a2a', border: '1px solid #52b788', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#52b788', fontSize: 13 }}>
          ✓ {mensagem}
        </div>
      )}

      {buscando && <p style={{ color: '#aaa', fontSize: 13 }}>Buscando...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resultados.map(e => {
          const grupo = e.grupos
          return (
            <div key={e.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{e.nome}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{e.telefone}</div>
                {grupo && (
                  <div style={{ fontSize: 12, color: grupo.cor, marginTop: 2 }}>● {grupo.nome}</div>
                )}
              </div>
              <div>
                {e.checkin_at ? (
                  <span style={{ fontSize: 12, color: '#52b788', fontWeight: 600 }}>✓ Feito</span>
                ) : (
                  <button
                    onClick={() => handleCheckin(e)}
                    disabled={processando === e.id}
                    style={btnStyle}
                  >
                    {processando === e.id ? '...' : 'Check-in'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {busca.length >= 2 && !buscando && resultados.length === 0 && (
        <p style={{ color: '#555', fontSize: 13 }}>Nenhum encontrista encontrado para "{busca}".</p>
      )}
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
  borderRadius: 8, border: '1px solid #222', background: '#111',
}
const btnStyle = {
  padding: '7px 14px', borderRadius: 6, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
