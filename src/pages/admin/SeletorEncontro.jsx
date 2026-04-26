import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { listarEncontros, criarEncontro } from '../../services/encontros'
import { useEncontro } from '../../hooks/useEncontro'

export function SeletorEncontro() {
  const navigate = useNavigate()
  const { setEncontroId } = useEncontro()
  const [encontros, setEncontros] = useState([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [novoNome, setNovoNome] = useState('')

  useEffect(() => {
    listarEncontros().then(setEncontros).finally(() => setLoading(false))
  }, [])

  function selecionar(id) {
    setEncontroId(id)
    navigate('/admin/crm')
  }

  async function handleCriar(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    const novo = await criarEncontro({ nome: novoNome.trim() })
    setEncontroId(novo.id)
    navigate('/admin/crm')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Selecionar Encontro</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>
          Sair
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {encontros.map(e => (
            <button key={e.id} onClick={() => selecionar(e.id)} style={cardStyle}>
              <div style={{ fontWeight: 600 }}>{e.nome}</div>
              {e.data_inicio && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {new Date(e.data_inicio).toLocaleDateString('pt-BR')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        {criando ? (
          <form onSubmit={handleCriar} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Nome do encontro"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" style={btnStyle}>Criar</button>
            <button type="button" onClick={() => setCriando(false)} style={{ ...btnStyle, background: '#333' }}>✕</button>
          </form>
        ) : (
          <button onClick={() => setCriando(true)} style={{ ...btnStyle, width: '100%' }}>
            + Novo Encontro
          </button>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', cursor: 'pointer', textAlign: 'left',
}
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const btnStyle = {
  padding: '10px 16px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
