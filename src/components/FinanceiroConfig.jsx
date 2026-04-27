import { useState } from 'react'
import { X } from 'lucide-react'
import {
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
  criarItem,
  atualizarItem,
  deletarItem,
} from '../services/financeiro'

export function FinanceiroConfig({ encontroId, categorias, itens, onClose, onUpdate }) {
  const [subAba, setSubAba] = useState('categorias')
  const [error, setError] = useState(null)

  // Categorias
  const [novaCategoria, setNovaCategoria] = useState('')
  const [editandoCatId, setEditandoCatId] = useState(null)
  const [editandoCatNome, setEditandoCatNome] = useState('')

  // Itens
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemCategoria, setNovoItemCategoria] = useState(categorias[0]?.id || '')
  const [novoItemUnidade, setNovoItemUnidade] = useState('unid')
  const [editandoItemId, setEditandoItemId] = useState(null)
  const [editandoItemNome, setEditandoItemNome] = useState('')
  const [editandoItemUnidade, setEditandoItemUnidade] = useState('')
  const [editandoItemCategoria, setEditandoItemCategoria] = useState('')

  async function handleCriarCategoria() {
    if (!novaCategoria.trim()) return
    try {
      await criarCategoria(encontroId, novaCategoria.trim())
      setNovaCategoria('')
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleSalvarCategoria(id) {
    if (!editandoCatNome.trim()) return
    try {
      await atualizarCategoria(id, editandoCatNome.trim())
      setEditandoCatId(null)
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleDeletarCategoria(id) {
    try {
      await deletarCategoria(id)
      await onUpdate()
    } catch (e) { setError(e.message || 'Não é possível excluir categoria com itens associados') }
  }

  async function handleCriarItem() {
    if (!novoItemNome.trim() || !novoItemCategoria) return
    try {
      await criarItem(encontroId, novoItemCategoria, novoItemNome.trim(), novoItemUnidade || 'unid')
      setNovoItemNome('')
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleSalvarItem(id) {
    try {
      await atualizarItem(id, {
        nome: editandoItemNome,
        unidade: editandoItemUnidade,
        categoria_id: editandoItemCategoria,
      })
      setEditandoItemId(null)
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleDeletarItem(id) {
    try {
      await deletarItem(id)
      await onUpdate()
    } catch (e) { setError(e.message || 'Não é possível excluir item com registros associados') }
  }

  return (
    <div className="fin-config-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fin-config-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Categorias &amp; Itens</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="admin-error" style={{ marginBottom: 12 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div className="fin-config-tabs">
          <button className={`fin-config-tab ${subAba === 'categorias' ? 'active' : ''}`} onClick={() => setSubAba('categorias')}>
            Categorias
          </button>
          <button className={`fin-config-tab ${subAba === 'itens' ? 'active' : ''}`} onClick={() => setSubAba('itens')}>
            Itens
          </button>
        </div>

        {subAba === 'categorias' && (
          <>
            <ul className="fin-config-list">
              {categorias.map(cat => (
                <li key={cat.id}>
                  {editandoCatId === cat.id ? (
                    <>
                      <input
                        className="form-input"
                        value={editandoCatNome}
                        onChange={e => setEditandoCatNome(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-sm btn-success" onClick={() => handleSalvarCategoria(cat.id)}>Salvar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditandoCatId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{cat.nome}</span>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditandoCatId(cat.id); setEditandoCatNome(cat.nome) }}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeletarCategoria(cat.id)}>Excluir</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="fin-config-add">
              <input
                className="form-input"
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                placeholder="Nova categoria..."
                onKeyDown={e => e.key === 'Enter' && handleCriarCategoria()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleCriarCategoria}>Adicionar</button>
            </div>
          </>
        )}

        {subAba === 'itens' && (
          <>
            <ul className="fin-config-list">
              {itens.map(item => (
                <li key={item.id}>
                  {editandoItemId === item.id ? (
                    <>
                      <input
                        className="form-input"
                        value={editandoItemNome}
                        onChange={e => setEditandoItemNome(e.target.value)}
                        style={{ flex: 2, minWidth: 80 }}
                        placeholder="Nome"
                      />
                      <input
                        className="form-input"
                        value={editandoItemUnidade}
                        onChange={e => setEditandoItemUnidade(e.target.value)}
                        style={{ width: 70 }}
                        placeholder="unid"
                      />
                      <select
                        value={editandoItemCategoria}
                        onChange={e => setEditandoItemCategoria(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <button className="btn btn-sm btn-success" onClick={() => handleSalvarItem(item.id)}>Salvar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditandoItemId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{item.nome}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{item.unidade}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{item.fin_categorias?.nome}</span>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditandoItemId(item.id)
                          setEditandoItemNome(item.nome)
                          setEditandoItemUnidade(item.unidade)
                          setEditandoItemCategoria(item.categoria_id)
                        }}
                      >Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeletarItem(item.id)}>Excluir</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="fin-config-add" style={{ flexWrap: 'wrap', gap: 8 }}>
              <input
                className="form-input"
                value={novoItemNome}
                onChange={e => setNovoItemNome(e.target.value)}
                placeholder="Nome do item"
                style={{ flex: 2, minWidth: 100 }}
              />
              <select
                value={novoItemCategoria}
                onChange={e => setNovoItemCategoria(e.target.value)}
                style={{ flex: 1 }}
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <input
                className="form-input"
                value={novoItemUnidade}
                onChange={e => setNovoItemUnidade(e.target.value)}
                placeholder="unid"
                style={{ width: 80 }}
              />
              <button className="btn btn-primary" onClick={handleCriarItem}>Adicionar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
