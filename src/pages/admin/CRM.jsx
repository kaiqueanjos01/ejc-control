import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'
import './CRM.css'

export function CRM() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

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
    { id: 'sem_grupo', label: 'Sem Grupo', icon: '👥', color: '#8b5cf6' },
    { id: 'sem_checkin', label: 'Sem Check-in', icon: '⏱️', color: '#ec4899' },
    { id: 'incompleto', label: 'Ficha Incompleta', icon: '📋', color: '#f97316' },
    { id: 'completo', label: 'Completo', icon: '✨', color: '#10b981' },
  ]

  function copiarLinkFicha(token) {
    const url = `${window.location.origin}/ficha/${token}`
    navigator.clipboard.writeText(url)
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
        <div className="crm-stats">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{encontristas.length}</span>
          </div>
        </div>
      </div>

      <div className="crm-search">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                                  <p className="card-phone">{encontrista.telefone}</p>
                                  <div className="card-status">
                                    {encontrista.checkin_at && <span className="status-badge checkin">✓ Check-in</span>}
                                    {Object.keys(encontrista.dados_extras ?? {}).length > 0 && (
                                      <span className="status-badge ficha">📋 Ficha</span>
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
                                    📎 Copiar
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
