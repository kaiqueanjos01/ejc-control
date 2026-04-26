import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'
import { listarGrupos, criarGrupo, removerGrupo, atribuirGrupo, sugerirGrupos } from '../../services/grupos'

export function Grupos() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoGrupo, setNovoGrupo] = useState({ nome: '', cor: '#3a86ff' })
  const [criandoGrupo, setCriandoGrupo] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([listarEncontristas(encontroId), listarGrupos(encontroId)])
      .then(([e, g]) => { setEncontristas(e); setGrupos(g) })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  function getEncontristasDaColuna(grupoId) {
    return encontristas.filter(e => e.grupo_id === (grupoId ?? null))
  }

  async function handleDragEnd(result) {
    if (!result.destination) return
    const encontristaId = result.draggableId
    const destGrupoId = result.destination.droppableId === 'sem_grupo' ? null : result.destination.droppableId

    setEncontristas(prev =>
      prev.map(e => e.id === encontristaId ? { ...e, grupo_id: destGrupoId } : e)
    )
    await atribuirGrupo(encontristaId, destGrupoId)
  }

  async function handleSugerir() {
    const sugestoes = sugerirGrupos(encontristas, grupos)
    if (Object.keys(sugestoes).length === 0) {
      alert('Nenhuma sugestão disponível. Verifique se os encontristas têm "data_nascimento" preenchida e os grupos têm critérios de idade.')
      return
    }
    await Promise.all(
      Object.entries(sugestoes).map(([eid, gid]) => atribuirGrupo(eid, gid))
    )
    setEncontristas(prev =>
      prev.map(e => sugestoes[e.id] ? { ...e, grupo_id: sugestoes[e.id] } : e)
    )
  }

  async function handleCriarGrupo(e) {
    e.preventDefault()
    const novo = await criarGrupo({
      encontroId,
      nome: novoGrupo.nome,
      cor: novoGrupo.cor,
      ordem: grupos.length,
    })
    setGrupos(prev => [...prev, novo])
    setNovoGrupo({ nome: '', cor: '#3a86ff' })
    setCriandoGrupo(false)
  }

  async function handleRemoverGrupo(grupoId) {
    if (!confirm('Remover este grupo? Os encontristas voltarão para "Sem grupo".')) return
    await removerGrupo(grupoId)
    setGrupos(prev => prev.filter(g => g.id !== grupoId))
    setEncontristas(prev => prev.map(e => e.grupo_id === grupoId ? { ...e, grupo_id: null } : e))
  }

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  const colunas = [
    { id: 'sem_grupo', nome: 'Sem grupo', cor: '#6b7280' },
    ...grupos.map(g => ({ id: g.id, nome: g.nome, cor: g.cor })),
  ]

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Grupos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSugerir} style={btnSecStyle}>✨ Sugerir por idade</button>
          <button onClick={() => setCriandoGrupo(true)} style={btnStyle}>+ Grupo</button>
        </div>
      </div>

      {criandoGrupo && (
        <form onSubmit={handleCriarGrupo} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            placeholder="Nome do grupo"
            value={novoGrupo.nome}
            onChange={e => setNovoGrupo(p => ({ ...p, nome: e.target.value }))}
            required
            autoFocus
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="color"
            value={novoGrupo.cor}
            onChange={e => setNovoGrupo(p => ({ ...p, cor: e.target.value }))}
            style={{ width: 36, height: 36, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'none' }}
          />
          <button type="submit" style={btnStyle}>Criar</button>
          <button type="button" onClick={() => setCriandoGrupo(false)} style={btnSecStyle}>✕</button>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: 200, flex: '0 0 200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: col.cor }}>
                  ● {col.nome} ({getEncontristasDaColuna(col.id === 'sem_grupo' ? null : col.id).length})
                </span>
                {col.id !== 'sem_grupo' && (
                  <button onClick={() => handleRemoverGrupo(col.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>✕</button>
                )}
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 120, borderRadius: 8, padding: 8,
                      background: snapshot.isDraggingOver ? '#1a2a1a' : '#111',
                      border: `1px solid ${snapshot.isDraggingOver ? col.cor : '#222'}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    {getEncontristasDaColuna(col.id === 'sem_grupo' ? null : col.id).map((e, index) => (
                      <Draggable key={e.id} draggableId={e.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              padding: '8px 10px', borderRadius: 6, marginBottom: 6,
                              background: snapshot.isDragging ? '#2a2a2a' : '#1a1a1a',
                              border: '1px solid #2a2a2a', fontSize: 13, cursor: 'grab',
                              ...provided.draggableProps.style,
                            }}
                          >
                            {e.nome}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 13,
}
const btnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer',
}
