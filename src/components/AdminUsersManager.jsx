import { useState, useEffect } from 'react'
import {
  listarAdmins,
  obterAdminAtual,
  criarConviteAdmin,
  listarConvites,
  atualizarAdminRole,
  atualizarAdminCoord,
  deletarAdmin,
  deletarConvite,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  verificarPermissao,
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
  const [novoIsCoord, setNovoIsCoord] = useState(false)
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
      const convite = await criarConviteAdmin(novoEmail, novoRole, novoIsCoord)
      const link = `${window.location.origin}/admin/convite/${convite.token}`
      setLinkGerado(link)
      setNovoEmail('')
      setNovoRole('moderador')
      setNovoIsCoord(false)
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

  const podeConvidar = verificarPermissao(usuarioAtual, 'canCreateInvites')
  const podeVerConvites = verificarPermissao(usuarioAtual, 'canViewInvites')
  const podeEditarUsuarios = verificarPermissao(usuarioAtual, 'canEditUsers')
  const podeDeletarUsuarios = verificarPermissao(usuarioAtual, 'canDeleteUsers')
  const TEAM_ROLES_LOCAL = ['equipe_externa', 'bem_estar', 'supers']
  const isAdmin = usuarioAtual.role === 'admin'

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
          <strong>Seu papel:</strong> {ROLE_LABELS[usuarioAtual.role] ?? usuarioAtual.role}
          {usuarioAtual.is_coord && <span style={{ marginLeft: 8, color: 'var(--color-primary)' }}>Coordenador</span>}
          {' '}- {ROLE_DESCRIPTIONS[usuarioAtual.role]}
        </p>
      </div>

      {podeConvidar && (
        <button className="btn btn-primary" onClick={() => setShowNovoConvite(!showNovoConvite)}>
          {showNovoConvite ? 'Cancelar' : '+ Novo Convite'}
        </button>
      )}

      {showNovoConvite && (
        <div className="novo-convite-form">
          <h3>Gerar Convite</h3>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="pessoa@example.com"
            />
          </div>
          <div className="form-group">
            <label>Papel *</label>
            <select value={novoRole} onChange={(e) => setNovoRole(e.target.value)}>
              {isAdmin ? (
                <>
                  <option value="admin">Admin — {ROLE_DESCRIPTIONS.admin}</option>
                  <option value="moderador">Moderador — {ROLE_DESCRIPTIONS.moderador}</option>
                  <option value="visualizador">Visualizador — {ROLE_DESCRIPTIONS.visualizador}</option>
                  <option value="equipe_externa">Equipe Externa — {ROLE_DESCRIPTIONS.equipe_externa}</option>
                  <option value="bem_estar">Bem Estar — {ROLE_DESCRIPTIONS.bem_estar}</option>
                  <option value="supers">Supers — {ROLE_DESCRIPTIONS.supers}</option>
                </>
              ) : (
                <option value={usuarioAtual.role}>
                  {ROLE_LABELS[usuarioAtual.role]} — {ROLE_DESCRIPTIONS[usuarioAtual.role]}
                </option>
              )}
            </select>
          </div>
          {isAdmin && TEAM_ROLES_LOCAL.includes(novoRole) && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={novoIsCoord}
                  onChange={(e) => setNovoIsCoord(e.target.checked)}
                />
                Tornar coordenador de equipe
              </label>
            </div>
          )}
          <button className="btn btn-success" onClick={handleCriarConvite}>
            Gerar Convite
          </button>
        </div>
      )}

      {/* Seção de Convites Ativos */}
      {(podeVerConvites || podeConvidar) && convites.length > 0 && (
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
                      <span className={`badge badge-${convite.role}`}>
                        {ROLE_LABELS[convite.role] ?? convite.role}
                      </span>
                      {convite.is_coord && <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>· Coord</span>}
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
        <h3>
          {usuarioAtual.is_coord && ['equipe_externa', 'bem_estar', 'supers'].includes(usuarioAtual.role)
            ? `Membros da Equipe (${admins.length})`
            : `Usuários Ativos (${admins.length})`}
        </h3>

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
                  <th>Papel</th>
                  <th>Criado em</th>
                  {(podeEditarUsuarios || podeDeletarUsuarios) && <th>Ações</th>}
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
                      {podeEditarUsuarios ? (
                        <>
                          <select
                            value={admin.role}
                            onChange={(e) => handleAtualizarRole(admin.id, e.target.value)}
                            disabled={admin.id === usuarioAtual.id}
                          >
                            <option value="admin">Admin</option>
                            <option value="moderador">Moderador</option>
                            <option value="visualizador">Visualizador</option>
                            <option value="equipe_externa">Equipe Externa</option>
                            <option value="bem_estar">Bem Estar</option>
                            <option value="supers">Supers</option>
                          </select>
                          {TEAM_ROLES_LOCAL.includes(admin.role) && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={admin.is_coord ?? false}
                                disabled={admin.id === usuarioAtual.id}
                                onChange={(e) => atualizarAdminCoord(admin.id, e.target.checked).then(carregarDados).catch(err => setError(err.message))}
                              />
                              Coord
                            </label>
                          )}
                        </>
                      ) : (
                        <>
                          <span className={`badge badge-${admin.role}`}>
                            {ROLE_LABELS[admin.role] ?? admin.role}
                          </span>
                          {TEAM_ROLES_LOCAL.includes(admin.role) && admin.is_coord && (
                            <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>· Coord</span>
                          )}
                        </>
                      )}
                    </td>
                    <td>{new Date(admin.criado_em).toLocaleDateString('pt-BR')}</td>
                    {(podeEditarUsuarios || podeDeletarUsuarios) && (
                      <td>
                        {admin.id === usuarioAtual.id ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <div className="action-buttons">
                            {podeDeletarUsuarios && (
                              deletandoId === admin.id ? (
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
                              )
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
