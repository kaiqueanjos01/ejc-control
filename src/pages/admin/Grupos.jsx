import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Wand2, X, Check, FileText } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'
import { listarGrupos, criarGrupo, removerGrupo, atribuirGrupo, sugerirGrupos } from '../../services/grupos'
import './Grupos.css'

export function Grupos() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoGrupo, setNovoGrupo] = useState({ nome: '', cor: '#6366f1', idadeMin: '', idadeMax: '' })
  const [criandoGrupo, setCriandoGrupo] = useState(false)
  const [sugestoesPendentes, setSugestoesPendentes] = useState(false)

  useEffect(() => {
    if (!encontroId) {
      navigate('/admin')
      return
    }
    Promise.all([listarEncontristas(encontroId), listarGrupos(encontroId)])
      .then(([e, g]) => {
        setEncontristas(e)
        setGrupos(g)
      })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  function getEncontristasDaColuna(grupoId) {
    return encontristas.filter((e) => e.grupo_id === (grupoId ?? null))
  }

  async function handleDragEnd(result) {
    if (!result.destination) return
    const encontristaId = result.draggableId
    const destGrupoId = result.destination.droppableId === 'sem_grupo' ? null : result.destination.droppableId

    setEncontristas((prev) =>
      prev.map((e) => (e.id === encontristaId ? { ...e, grupo_id: destGrupoId } : e))
    )
    await atribuirGrupo(encontristaId, destGrupoId)
  }

  async function handleSugerir() {
    setSugestoesPendentes(true)
    const sugestoes = sugerirGrupos(encontristas, grupos)
    if (Object.keys(sugestoes).length === 0) {
      alert('Nenhuma sugestão disponível. Verifique se os encontristas têm "data_nascimento" preenchida e os grupos têm critérios de idade.')
      setSugestoesPendentes(false)
      return
    }
    await Promise.all(Object.entries(sugestoes).map(([eid, gid]) => atribuirGrupo(eid, gid)))
    setEncontristas((prev) => prev.map((e) => (sugestoes[e.id] ? { ...e, grupo_id: sugestoes[e.id] } : e)))
    setSugestoesPendentes(false)
  }

  async function handleCriarGrupo(e) {
    e.preventDefault()
    const novo = await criarGrupo({
      encontroId,
      nome: novoGrupo.nome,
      cor: novoGrupo.cor,
      criterioIdadeMin: novoGrupo.idadeMin !== '' ? Number(novoGrupo.idadeMin) : null,
      criterioIdadeMax: novoGrupo.idadeMax !== '' ? Number(novoGrupo.idadeMax) : null,
      ordem: grupos.length,
    })
    setGrupos((prev) => [...prev, novo])
    setNovoGrupo({ nome: '', cor: '#6366f1', idadeMin: '', idadeMax: '' })
    setCriandoGrupo(false)
  }

  async function handleRemoverGrupo(grupoId) {
    if (!confirm('Remover este grupo? Os encontristas voltarão para "Sem grupo".')) return
    await removerGrupo(grupoId)
    setGrupos((prev) => prev.filter((g) => g.id !== grupoId))
    setEncontristas((prev) => prev.map((e) => (e.grupo_id === grupoId ? { ...e, grupo_id: null } : e)))
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="grupos-loading">
          <div className="spinner"></div>
          <p>Carregando grupos...</p>
        </div>
      </AdminLayout>
    )
  }

  const colunas = [
    { id: 'sem_grupo', nome: 'Sem Grupo', cor: '#9ca3af', isDummy: true },
    ...grupos.map((g) => ({ id: g.id, nome: g.nome, cor: g.cor, isDummy: false, idadeMin: g.criterio_idade_min, idadeMax: g.criterio_idade_max })),
  ]

  return (
    <AdminLayout>
      <div className="grupos-header">
        <div>
          <h1 className="grupos-title">Organização de Grupos</h1>
          <p className="grupos-subtitle">Arraste encontristas para reorganizar os grupos</p>
        </div>
        <div className="grupos-actions">
          <button className="btn btn-secondary" onClick={handleSugerir} disabled={sugestoesPendentes}>
            <Wand2 size={14} /> {sugestoesPendentes ? 'Processando...' : 'Sugerir por Idade'}
          </button>
          <button className="btn btn-primary" onClick={() => setCriandoGrupo(true)}>
            + Novo Grupo
          </button>
        </div>
      </div>

      {criandoGrupo && (
        <form onSubmit={handleCriarGrupo} className="novo-grupo-form">
          <input
            placeholder="Nome do grupo"
            value={novoGrupo.nome}
            onChange={(e) => setNovoGrupo((p) => ({ ...p, nome: e.target.value }))}
            required
            autoFocus
            className="form-input"
          />
          <input
            type="color"
            value={novoGrupo.cor}
            onChange={(e) => setNovoGrupo((p) => ({ ...p, cor: e.target.value }))}
            className="color-picker"
          />
          <input
            type="number"
            placeholder="Idade mín."
            value={novoGrupo.idadeMin}
            onChange={(e) => setNovoGrupo((p) => ({ ...p, idadeMin: e.target.value }))}
            min="0"
            max="99"
            className="form-input"
            style={{ width: '90px' }}
          />
          <input
            type="number"
            placeholder="Idade máx."
            value={novoGrupo.idadeMax}
            onChange={(e) => setNovoGrupo((p) => ({ ...p, idadeMax: e.target.value }))}
            min="0"
            max="99"
            className="form-input"
            style={{ width: '90px' }}
          />
          <button type="submit" className="btn btn-primary">
            Criar
          </button>
          <button type="button" onClick={() => setCriandoGrupo(false)} className="btn btn-secondary">
            Cancelar
          </button>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-container">
          {colunas.map((col) => {
            const items = getEncontristasDaColuna(col.id === 'sem_grupo' ? null : col.id)
            return (
              <div key={col.id} className="kanban-column-wrapper">
                <div className="column-header-premium" style={{ '--header-color': col.cor }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="header-content">
                      <h3 className="column-name">{col.nome}</h3>
                      <span className="column-badge">{items.length}</span>
                    </div>
                    {!col.isDummy && (
                      <button className="btn-remove" onClick={() => handleRemoverGrupo(col.id)} title="Remover grupo">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {(col.idadeMin != null || col.idadeMax != null) && (
                    <span className="column-age-range">
                      {col.idadeMin != null && col.idadeMax != null
                        ? `${col.idadeMin}–${col.idadeMax} anos`
                        : col.idadeMin != null
                        ? `${col.idadeMin}+ anos`
                        : `até ${col.idadeMax} anos`}
                    </span>
                  )}
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`droppable-container ${snapshot.isDraggingOver ? 'active' : ''}`}
                    >
                      {items.length === 0 ? (
                        <div className="empty-state">
                          <span>Nenhum encontrista</span>
                        </div>
                      ) : (
                        items.map((e, index) => (
                          <Draggable key={e.id} draggableId={e.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`participant-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                onClick={() => navigate(`/admin/crm/${e.id}`)}
                              >
                                <div className="card-content">
                                  <h4 className="participant-name">{e.nome}</h4>
                                  <p className="participant-phone">{e.telefone}</p>
                                  <div className="participant-meta">
                                    {e.checkin_at && (
                                      <span className="meta-badge checkin"><Check size={10} /> Check-in</span>
                                    )}
                                    {Object.keys(e.dados_extras ?? {}).length > 0 && (
                                      <span className="meta-badge ficha"><FileText size={10} /> Ficha</span>
                                    )}
                                  </div>
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
