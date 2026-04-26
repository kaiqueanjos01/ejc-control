import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listarEncontros, criarEncontro } from '../../services/encontros'
import { useEncontro } from '../../hooks/useEncontro'
import './SeletorEncontro.css'

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
    <div className="seletor-encontro">
      <div className="seletor-encontro__header">
        <h1 className="seletor-encontro__title">Selecionar Encontro</h1>
        <button
          onClick={handleLogout}
          className="seletor-encontro__logout"
        >
          Sair
        </button>
      </div>

      {loading ? (
        <p className="seletor-encontro__loading">Carregando...</p>
      ) : (
        <div className="seletor-encontro__list">
          {encontros.map(e => (
            <button
              key={e.id}
              onClick={() => selecionar(e.id)}
              className="seletor-encontro__card"
            >
              <div className="seletor-encontro__card-title">{e.nome}</div>
              {e.data_inicio && (
                <div className="seletor-encontro__card-date">
                  {new Date(e.data_inicio).toLocaleDateString('pt-BR')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="seletor-encontro__form-section">
        {criando ? (
          <form onSubmit={handleCriar} className="seletor-encontro__form">
            <div className="seletor-encontro__form-input">
              <input
                placeholder="Nome do encontro"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                autoFocus
                className="form-input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm seletor-encontro__btn-submit"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setCriando(false)}
              className="btn btn-secondary btn-sm seletor-encontro__btn-cancel"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCriando(true)}
            className="btn btn-primary btn-full seletor-encontro__btn-new"
          >
            + Novo Encontro
          </button>
        )}
      </div>
    </div>
  )
}
