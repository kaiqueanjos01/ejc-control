import { useState, useEffect } from 'react'
import {
  listarAdmins,
  obterAdminAtual,
  criarConviteAdmin,
  listarConvites,
  atualizarAdminRole,
  deletarAdmin,
  deletarConvite,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
} from '../services/adminUsers'
import './AdminUsersManager.css'

export default function AdminUsersManager() {
  const [admins, setAdmins] = useState([])
  const [convites, setConvites] = useState([])
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNovoConvite, setShowNovoConvite] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoRole, setNovoRole] = useState('moderador')
  const [deletandoId, setDeletandoId] = useState(null)
  const [linkGerado, setLinkGerado] = useState(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  // Carregar dados
  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      const [adminsData, currentUser, convidadosData] = await Promise.all([
        listarAdmins(),
        obterAdminAtual(),
        listarConvites(),
      ])
      setAdmins(adminsData)
      setUsuarioAtual(currentUser)
      setConvites(convidadosData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCriarConvite() {
    try {
      if (!novoEmail.trim()) {
        setError('Email é obrigatório')
        return
      }
      const convite = await criarConviteAdmin(novoEmail, novoRole)
      const link = `${window.location.origin}/admin/convite/${convite.token}`
      setLinkGerado(link)
      setNovoEmail('')
      setNovoRole('moderador')
      setShowNovoConvite(false)
      await carregarDados()
    } catch (err) {
      setError(err.message)
    }
  }

  function copiarLink(link) {
    navigator.clipboard.writeText(link)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  async function handleDeletarConvite(conviteId) {
    try {
      await deletarConvite(conviteId)
      await carregarDados()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAtualizarRole(adminId, novoRole) {
    try {
      await atualizarAdminRole(adminId, novoRole)
      await carregarDados()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeletarAdmin(adminId) {
    try {
      await deletarAdmin(adminId)
      setDeletandoId(null)
      await carregarDados()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-users-container">
        <p className="text-muted">Carregando...</p>
      </div>
    )
  }

  if (!usuarioAtual) {
    return (
      <div className="admin-users-container">
        <h2>Equipe</h2>
        <div className="admin-restricted">
          Seu usuário ainda não está cadastrado na tabela de admins. Peça a um admin para adicioná-lo, ou execute a migration inicial para criar seu registro.
        </div>
      </div>
    )
  }

  const podeGerenciar = ROLE_PERMISSIONS[usuarioAtual.role]?.canCreateInvites

  return (
    <div className="admin-users-container">
      <h2>Equipe</h2>

      {error && <div className="admin-error">{error}</div>}

      {linkGerado && (
        <div className="admin-invite-link">
          <p className="admin-invite-link-label">Convite gerado! Copie o link e envie para a pessoa:</p>
          <div className="admin-invite-link-row">
            <input readOnly value={linkGerado} className="form-input" />
            <button className="btn btn-primary" onClick={() => copiarLink(linkGerado)}>
              {linkCopiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => setLinkGerado(null)}>
            Fechar
          </button>
        </div>
      )}

      <div className="admin-info">
        <p>
          <strong>Seu Role:</strong> {usuarioAtual.role} - {ROLE_DESCRIPTIONS[usuarioAtual.role]}
        </p>
      </div>

      {podeGerenciar && (
        <button className="btn btn-primary" onClick={() => setShowNovoConvite(!showNovoConvite)}>
          {showNovoConvite ? 'Cancelar' : '+ Novo Convite'}
        </button>
      )}

      {showNovoConvite && (
        <div className="novo-convite-form">
          <h3>Gerar Convite de Admin</h3>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select value={novoRole} onChange={(e) => setNovoRole(e.target.value)}>
              <option value="admin">Admin - {ROLE_DESCRIPTIONS.admin}</option>
              <option value="moderador">Moderador - {ROLE_DESCRIPTIONS.moderador}</option>
              <option value="visualizador">Visualizador - {ROLE_DESCRIPTIONS.visualizador}</option>
            </select>
          </div>
          <button className="btn btn-success" onClick={handleCriarConvite}>
            Gerar Convite
          </button>
        </div>
      )}

      {/* Seção de Convites Ativos */}
      {podeGerenciar && convites.length > 0 && (
        <div className="convites-section">
          <h3>Convites Ativos ({convites.length})</h3>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expira em</th>
                  <th>Link</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {convites.map((convite) => (
                  <tr key={convite.id}>
                    <td>{convite.email}</td>
                    <td>
                      <span className={`badge badge-${convite.role}`}>{convite.role}</span>
                    </td>
                    <td>{new Date(convite.expira_em).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => copiarLink(`${window.location.origin}/admin/convite/${convite.token}`)}
                      >
                        Copiar link
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeletarConvite(convite.id)}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seção de Admins */}
      <div className="admins-section">
        <h3>Usuários Ativos ({admins.length})</h3>

        {loading ? (
          <p>Carregando...</p>
        ) : admins.length === 0 ? (
          <p className="empty-state">Nenhum admin cadastrado</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Criado em</th>
                  {podeGerenciar && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className={admin.id === usuarioAtual.id ? 'is-current' : ''}>
                    <td>
                      {admin.nome}
                      {admin.id === usuarioAtual.id && <span className="badge badge-current">Você</span>}
                    </td>
                    <td>{admin.email}</td>
                    <td>
                      {podeGerenciar ? (
                        <select
                          value={admin.role}
                          onChange={(e) => handleAtualizarRole(admin.id, e.target.value)}
                          disabled={admin.id === usuarioAtual.id}
                        >
                          <option value="admin">admin</option>
                          <option value="moderador">moderador</option>
                          <option value="visualizador">visualizador</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${admin.role}`}>{admin.role}</span>
                      )}
                    </td>
                    <td>{new Date(admin.criado_em).toLocaleDateString('pt-BR')}</td>
                    {podeGerenciar && (
                      <td>
                        {admin.id === usuarioAtual.id ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <div className="action-buttons">
                            {deletandoId === admin.id ? (
                              <>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeletarAdmin(admin.id)}
                                >
                                  Confirmar?
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setDeletandoId(null)}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setDeletandoId(admin.id)}
                              >
                                Deletar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
