import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { UserX, Clock, FileText, CheckCircle, Check, Link, Users, UserPlus, X } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas, criarEncontrista } from '../../services/encontristas'
import { useMaskInput } from '../../hooks/useMaskInput'
import { applyMask } from '../../utils/masks'
import './CRM.css'

export function CRM() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const { inputValue: telDisplay, handleChange: handleTelChange, rawValue: novoTelefone, reset: resetTel } = useMaskInput('phone')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!encontroId) {
      navigate('/admin')
      return
    }
    listarEncontristas(encontroId)
      .then(setEncontristas)
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  const getEncontristasPorStatus = (status) => {
    return encontristas.filter(e => {
      const matchBusca = e.nome.toLowerCase().includes(busca.toLowerCase())
      if (!matchBusca) return false

      if (status === 'sem_grupo') return !e.grupo_id
      if (status === 'sem_checkin') return e.grupo_id && !e.checkin_at
      if (status === 'incompleto') return e.grupo_id && e.checkin_at && Object.keys(e.dados_extras ?? {}).length === 0
      if (status === 'completo') return e.grupo_id && e.checkin_at && Object.keys(e.dados_extras ?? {}).length > 0
      return false
    })
  }

  const statusColunas = [
    { id: 'sem_grupo', label: 'Sem Grupo', icon: <Users size={14} />, color: '#8b5cf6' },
    { id: 'sem_checkin', label: 'Sem Check-in', icon: <Clock size={14} />, color: '#ec4899' },
    { id: 'incompleto', label: 'Ficha Incompleta', icon: <FileText size={14} />, color: '#f97316' },
    { id: 'completo', label: 'Completo', icon: <CheckCircle size={14} />, color: '#10b981' },
  ]

  function copiarLinkFicha(token) {
    const url = `${window.location.origin}/ficha/${token}`
    navigator.clipboard.writeText(url)
  }

  async function handleCriarEncontrista(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      const novo = await criarEncontrista({ encontroId, nome: novoNome, telefone: novoTelefone })
      setEncontristas(prev => [novo, ...prev])
      setNovoNome('')
      resetTel()
      setShowNovoModal(false)
    } finally {
      setSalvando(false)
    }
  }

  function handleDragEnd(result) {
    // O drag-and-drop é apenas visual neste kanban
    // Se precisar persistir, adicione lógica de atualização aqui
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="crm-loading">
          <div className="spinner"></div>
          <p>Carregando encontristas...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="crm-header">
        <div>
          <h1 className="crm-title">Pipeline de Encontristas</h1>
          <p className="crm-subtitle">Visualize o progresso de cada participante</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNovoModal(true)}>
          <UserPlus size={14} /> Novo encontrista
        </button>
      </div>

      <div className="crm-stats">
        {[
          { label: 'Total', value: encontristas.length, color: 'default' },
          { label: 'Sem grupo', value: getEncontristasPorStatus('sem_grupo').length, color: 'purple' },
          { label: 'Sem check-in', value: getEncontristasPorStatus('sem_checkin').length, color: 'pink' },
          { label: 'Ficha incompleta', value: getEncontristasPorStatus('incompleto').length, color: 'orange' },
          { label: 'Completos', value: getEncontristasPorStatus('completo').length, color: 'green' },
        ].map(s => (
          <div key={s.label} className={`stat-item stat-item--${s.color}`}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {showNovoModal && (
        <div className="crm-modal-overlay" onClick={() => setShowNovoModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h3>Novo encontrista</h3>
              <button className="crm-modal-close" onClick={() => setShowNovoModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCriarEncontrista} className="crm-modal-form">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  className="form-input"
                  placeholder="Nome completo"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  className="form-input"
                  placeholder="(11) 99999-9999"
                  value={telDisplay}
                  onChange={handleTelChange}
                  inputMode="tel"
                  required
                />
              </div>
              <div className="crm-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Criar'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNovoModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="crm-search">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="search-input"
        />
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {statusColunas.map((status) => {
            const items = getEncontristasPorStatus(status.id)
            return (
              <div key={status.id} className="kanban-column">
                <div className="column-header" style={{ '--header-color': status.color }}>
                  <div className="header-info">
                    <span className="header-icon">{status.icon}</span>
                    <div>
                      <h3 className="column-title">{status.label}</h3>
                      <span className="column-count">{items.length}</span>
                    </div>
                  </div>
                </div>

                <Droppable droppableId={status.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`droppable-area ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                      {items.length === 0 ? (
                        <div className="empty-column">
                          <p className="empty-text">Nenhum encontrista</p>
                        </div>
                      ) : (
                        items.map((encontrista, index) => (
                          <Draggable key={encontrista.id} draggableId={encontrista.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                                onClick={() => navigate(`/admin/crm/${encontrista.id}`)}
                              >
                                <div className="card-header">
                                  <h4 className="card-name">{encontrista.nome}</h4>
                                  {encontrista.grupos && (
                                    <span className="group-badge" style={{ backgroundColor: encontrista.grupos.cor }}>
                                      {encontrista.grupos.nome}
                                    </span>
                                  )}
                                </div>
                                <div className="card-body">
                                  <p className="card-phone">{applyMask(encontrista.telefone ?? '', 'phone')}</p>
                                  <div className="card-status">
                                    {encontrista.checkin_at && (
                                      <span className="status-badge checkin">
                                        <Check size={10} /> Check-in
                                      </span>
                                    )}
                                    {Object.keys(encontrista.dados_extras ?? {}).length > 0 && (
                                      <span className="status-badge ficha">
                                        <FileText size={10} /> Ficha
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="card-footer">
                                  <button
                                    className="copy-btn"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copiarLinkFicha(encontrista.token)
                                    }}
                                    title="Copiar link"
                                  >
                                    <Link size={11} /> Copiar link
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </AdminLayout>
  )
}
