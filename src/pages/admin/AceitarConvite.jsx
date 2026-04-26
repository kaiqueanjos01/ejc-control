import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { aceitarConvite } from '../../services/adminUsers'
import './Login.css'

export function AceitarConvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [convite, setConvite] = useState(null)
  const [loadingConvite, setLoadingConvite] = useState(true)
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function verificarConvite() {
      const { data, error } = await supabase
        .from('admin_invites')
        .select('*')
        .eq('token', token)
        .is('usado_em', null)
        .gt('expira_em', new Date().toISOString())
        .single()

      if (error || !data) {
        setErro('Convite inválido ou expirado.')
      } else {
        setConvite(data)
      }
      setLoadingConvite(false)
    }
    verificarConvite()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    setErro(null)
    try {
      await aceitarConvite(token, convite.email, nome, senha)
      setSucesso(true)
      setTimeout(() => navigate('/admin/login'), 2500)
    } catch (err) {
      setErro(err.message)
      setLoading(false)
    }
  }

  if (loadingConvite) {
    return (
      <div className="login-container">
        <div className="login-card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Verificando convite...</p>
        </div>
      </div>
    )
  }

  if (erro && !convite) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">EJC</div>
            <h1 className="login-title">Convite inválido</h1>
            <p className="login-subtitle">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">EJC</div>
            <h1 className="login-title">Conta criada!</h1>
            <p className="login-subtitle">Redirecionando para o login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">EJC</div>
          <h1 className="login-title">Criar conta</h1>
          <p className="login-subtitle">Você foi convidado como <strong>{convite.role}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              value={convite.email}
              readOnly
              className="form-input"
              style={{ opacity: 0.6 }}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Senha (mín. 6 caracteres)"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {erro && <div className="login-error">{erro}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary btn-full">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
