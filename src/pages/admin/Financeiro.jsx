import { useState, useEffect, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import {
  listarCategorias,
  listarItens,
  listarDespesas,
  listarDoacoes,
  criarDespesa,
  deletarDespesa,
  criarDoacao,
  deletarDoacao,
  criarItem,
  calcularTotalPorCategoria,
  calcularTotalDespesas,
  calcularTotalDoacoesDinheiro,
  calcularInventario,
} from '../../services/financeiro'
import { FinanceiroConfig } from '../../components/FinanceiroConfig'
import { applyMask, stripMask } from '../../utils/masks'
import './Financeiro.css'

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

export function Financeiro() {
  const { encontroId } = useEncontro()

  const [aba, setAba] = useState('resumo')
  const [categorias, setCategorias] = useState([])
  const [itens, setItens] = useState([])
  const [despesas, setDespesas] = useState([])
  const [doacoes, setDoacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false)

  // Estado do formulário de despesa
  const [showFormDespesa, setShowFormDespesa] = useState(false)
  const [fdItemId, setFdItemId] = useState('')
  const [fdCriarItem, setFdCriarItem] = useState(false)
  const [fdNovoItemNome, setFdNovoItemNome] = useState('')
  const [fdNovoItemCategoria, setFdNovoItemCategoria] = useState('')
  const [fdNovoItemUnidade, setFdNovoItemUnidade] = useState('unid')
  const [fdQtd, setFdQtd] = useState('')
  const [fdValor, setFdValor] = useState('')
  const [fdData, setFdData] = useState(hoje())
  const [fdObs, setFdObs] = useState('')
  const [fdSaving, setFdSaving] = useState(false)

  // Estado do formulário de doação
  const [showFormDoacao, setShowFormDoacao] = useState(false)
  const [doTipo, setDoTipo] = useState('dinheiro')
  const [doValor, setDoValor] = useState('')
  const [doItemId, setDoItemId] = useState('')
  const [doQtd, setDoQtd] = useState('')
  const [doDoador, setDoDoador] = useState('')
  const [doData, setDoData] = useState(hoje())
  const [doObs, setDoObs] = useState('')
  const [doSaving, setDoSaving] = useState(false)

  const [confirmandoId, setConfirmandoId] = useState(null)
  const [confirmandoTipo, setConfirmandoTipo] = useState(null)

  const carregar = useCallback(async () => {
    if (!encontroId) return
    try {
      setLoading(true)
      const [cats, its, desps, doas] = await Promise.all([
        listarCategorias(encontroId),
        listarItens(encontroId),
        listarDespesas(encontroId),
        listarDoacoes(encontroId),
      ])
      setCategorias(cats)
      setItens(its)
      setDespesas(desps)
      setDoacoes(doas)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [encontroId])

  useEffect(() => { carregar() }, [carregar])

  // ── handlers despesa ──────────────────────────────────────────────────────

  async function handleSalvarDespesa() {
    try {
      setFdSaving(true)
      let itemId = fdItemId
      if (fdCriarItem) {
        if (!fdNovoItemNome.trim() || !fdNovoItemCategoria) {
          setError('Nome e categoria do item são obrigatórios')
          return
        }
        if (!fdQtd || !fdValor) { setError('Quantidade e valor são obrigatórios'); return }
        const novoItem = await criarItem(encontroId, fdNovoItemCategoria, fdNovoItemNome.trim(), fdNovoItemUnidade)
        itemId = novoItem.id
      }
      if (!itemId) { setError('Selecione um item'); return }
      if (!fdQtd || !fdValor) { setError('Quantidade e valor são obrigatórios'); return }
      await criarDespesa(encontroId, itemId, parseFloat(fdQtd), parseInt(fdValor || '0') / 100, fdData, fdObs)
      resetFormDespesa()
      await carregar()
    } catch (e) {
      setError(e.message)
    } finally {
      setFdSaving(false)
    }
  }

  function resetFormDespesa() {
    setShowFormDespesa(false)
    setFdItemId(''); setFdCriarItem(false)
    setFdNovoItemNome(''); setFdNovoItemCategoria(''); setFdNovoItemUnidade('unid')
    setFdQtd(''); setFdValor(''); setFdData(hoje()); setFdObs('')
  }

  // ── handlers doação ───────────────────────────────────────────────────────

  async function handleSalvarDoacao() {
    try {
      setDoSaving(true)
      if (doTipo === 'dinheiro' && !doValor) { setError('Valor é obrigatório'); return }
      if (doTipo === 'item' && (!doItemId || !doQtd)) { setError('Item e quantidade são obrigatórios'); return }
      await criarDoacao(encontroId, doTipo, {
        valor: doTipo === 'dinheiro' ? parseInt(doValor || '0') / 100 : null,
        itemId: doTipo === 'item' ? doItemId : null,
        quantidade: doTipo === 'item' ? parseFloat(doQtd) : null,
        doador: doDoador || null,
        data: doData,
        observacao: doObs || null,
      })
      resetFormDoacao()
      await carregar()
    } catch (e) {
      setError(e.message)
    } finally {
      setDoSaving(false)
    }
  }

  function resetFormDoacao() {
    setShowFormDoacao(false)
    setDoTipo('dinheiro'); setDoValor(''); setDoItemId('')
    setDoQtd(''); setDoDoador(''); setDoData(hoje()); setDoObs('')
  }

  // ── handler deletar ───────────────────────────────────────────────────────

  async function handleDeletar(id, tipo) {
    try {
      if (tipo === 'despesa') await deletarDespesa(id)
      else await deletarDoacao(id)
      setConfirmandoId(null)
      await carregar()
    } catch (e) {
      setError(e.message)
    }
  }

  // ── cálculos ──────────────────────────────────────────────────────────────

  const resumoPorCategoria = calcularTotalPorCategoria(categorias, itens, despesas)
  const totalDespesas = calcularTotalDespesas(despesas)
  const totalDoacoesDinheiro = calcularTotalDoacoesDinheiro(doacoes)
  const inventario = calcularInventario(itens, despesas, doacoes)

  // ── render ────────────────────────────────────────────────────────────────

  if (!encontroId) {
    return (
      <AdminLayout>
        <div className="financeiro-container">
          <p className="text-muted">Selecione um encontro para acessar o financeiro.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="financeiro-container">
        <div className="financeiro-header">
          <h2>Financeiro</h2>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Gerenciar categorias e itens">
            <Settings size={14} /> Categorias &amp; Itens
          </button>
        </div>

        {error && <div className="admin-error">{error}<button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></div>}

        <div className="financeiro-tabs">
          {['resumo', 'despesas', 'doacoes'].map(t => (
            <button
              key={t}
              className={`financeiro-tab ${aba === t ? 'active' : ''}`}
              onClick={() => setAba(t)}
            >
              {t === 'resumo' ? 'Resumo' : t === 'despesas' ? 'Despesas' : 'Doações'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">Carregando...</p>
        ) : (
          <>
            {aba === 'resumo' && (
              <AbaResumo
                resumo={resumoPorCategoria}
                despesas={despesas}
                totalDespesas={totalDespesas}
                totalDoacoesDinheiro={totalDoacoesDinheiro}
                inventario={inventario}
              />
            )}
            {aba === 'despesas' && (
              <AbaDespesas
                despesas={despesas}
                itens={itens}
                categorias={categorias}
                showForm={showFormDespesa}
                setShowForm={setShowFormDespesa}
                fdItemId={fdItemId} setFdItemId={setFdItemId}
                fdCriarItem={fdCriarItem} setFdCriarItem={setFdCriarItem}
                fdNovoItemNome={fdNovoItemNome} setFdNovoItemNome={setFdNovoItemNome}
                fdNovoItemCategoria={fdNovoItemCategoria} setFdNovoItemCategoria={setFdNovoItemCategoria}
                fdNovoItemUnidade={fdNovoItemUnidade} setFdNovoItemUnidade={setFdNovoItemUnidade}
                fdQtd={fdQtd} setFdQtd={setFdQtd}
                fdValor={fdValor} setFdValor={setFdValor}
                fdData={fdData} setFdData={setFdData}
                fdObs={fdObs} setFdObs={setFdObs}
                fdSaving={fdSaving}
                onSalvar={handleSalvarDespesa}
                onCancelar={resetFormDespesa}
                confirmandoId={confirmandoId} setConfirmandoId={setConfirmandoId}
                confirmandoTipo={confirmandoTipo} setConfirmandoTipo={setConfirmandoTipo}
                onDeletar={handleDeletar}
              />
            )}
            {aba === 'doacoes' && (
              <AbaDoacoes
                doacoes={doacoes}
                itens={itens}
                showForm={showFormDoacao}
                setShowForm={setShowFormDoacao}
                doTipo={doTipo} setDoTipo={setDoTipo}
                doValor={doValor} setDoValor={setDoValor}
                doItemId={doItemId} setDoItemId={setDoItemId}
                doQtd={doQtd} setDoQtd={setDoQtd}
                doDoador={doDoador} setDoDoador={setDoDoador}
                doData={doData} setDoData={setDoData}
                doObs={doObs} setDoObs={setDoObs}
                doSaving={doSaving}
                onSalvar={handleSalvarDoacao}
                onCancelar={resetFormDoacao}
                confirmandoId={confirmandoId} setConfirmandoId={setConfirmandoId}
                confirmandoTipo={confirmandoTipo} setConfirmandoTipo={setConfirmandoTipo}
                onDeletar={handleDeletar}
              />
            )}
          </>
        )}
      </div>

      {showConfig && (
        <FinanceiroConfig
          encontroId={encontroId}
          categorias={categorias}
          itens={itens}
          onClose={() => setShowConfig(false)}
          onUpdate={carregar}
        />
      )}
    </AdminLayout>
  )
}

// ─── Aba Resumo ───────────────────────────────────────────────────────────────

function AbaResumo({ resumo, despesas, totalDespesas, totalDoacoesDinheiro, inventario }) {
  if (resumo.length === 0) {
    return <p className="fin-empty">Nenhuma categoria cadastrada. Use "Categorias &amp; Itens" para começar.</p>
  }

  function totaisItensPorCategoria(itensDaCategoria, despesas) {
    return itensDaCategoria.map(item => {
      const totalItem = despesas
        .filter(d => d.item_id === item.id)
        .reduce((s, d) => s + d.quantidade * d.valor_unitario, 0)
      const qtdTotal = despesas
        .filter(d => d.item_id === item.id)
        .reduce((s, d) => s + d.quantidade, 0)
      return { ...item, totalItem, qtdTotal }
    }).filter(i => i.qtdTotal > 0)
  }

  return (
    <>
      <div className="resumo-grid">
        {resumo.map(cat => {
          const itensCat = totaisItensPorCategoria(cat.itens, despesas)
          return (
            <div key={cat.id} className="resumo-card">
              <div className="resumo-card-header">
                <span className="resumo-card-nome">{cat.nome}</span>
                <span className="resumo-card-total">{formatBRL(cat.total)}</span>
              </div>
              {itensCat.length > 0 ? (
                <ul className="resumo-card-itens">
                  {itensCat.map(item => (
                    <li key={item.id}>
                      <span>{item.nome} ({item.qtdTotal} {item.unidade})</span>
                      <span>{formatBRL(item.totalItem)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fin-empty" style={{ padding: 0, textAlign: 'left', fontSize: '0.8rem' }}>Sem despesas</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="resumo-rodape">
        <div className="resumo-rodape-item">
          <span className="resumo-rodape-label">Total Despesas</span>
          <span className={`resumo-rodape-valor ${totalDespesas > 0 ? 'negativo' : ''}`}>{formatBRL(totalDespesas)}</span>
        </div>
        <div className="resumo-rodape-item">
          <span className="resumo-rodape-label">Total Doações (dinheiro)</span>
          <span className={`resumo-rodape-valor ${totalDoacoesDinheiro > 0 ? 'positivo' : ''}`}>{formatBRL(totalDoacoesDinheiro)}</span>
        </div>
      </div>

      {inventario.length > 0 && (
        <div className="inventario-section">
          <h3 className="inventario-titulo">Inventário</h3>
          <div className="financeiro-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Comprado</th>
                  <th>Doado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map(item => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{item.fin_categorias?.nome}</td>
                    <td>{item.unidade}</td>
                    <td>{item.qtdComprada > 0 ? item.qtdComprada : '—'}</td>
                    <td>{item.qtdDoada > 0 ? item.qtdDoada : '—'}</td>
                    <td><strong>{item.qtdTotal}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Aba Despesas ─────────────────────────────────────────────────────────────

function AbaDespesas({
  despesas, itens, categorias,
  showForm, setShowForm,
  fdItemId, setFdItemId,
  fdCriarItem, setFdCriarItem,
  fdNovoItemNome, setFdNovoItemNome,
  fdNovoItemCategoria, setFdNovoItemCategoria,
  fdNovoItemUnidade, setFdNovoItemUnidade,
  fdQtd, setFdQtd,
  fdValor, setFdValor,
  fdData, setFdData,
  fdObs, setFdObs,
  fdSaving, onSalvar, onCancelar,
  confirmandoId, setConfirmandoId, confirmandoTipo, setConfirmandoTipo, onDeletar,
}) {
  return (
    <div>
      <div className="financeiro-toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Despesa'}
        </button>
      </div>

      {showForm && (
        <div className="financeiro-form">
          <h3>Nova Despesa</h3>
          <div className="financeiro-form-grid">
            <div className="form-group">
              <label>Item *</label>
              <select
                className="form-select"
                value={fdCriarItem ? '__novo__' : fdItemId}
                onChange={e => {
                  if (e.target.value === '__novo__') {
                    setFdCriarItem(true)
                    setFdItemId('')
                  } else {
                    setFdCriarItem(false)
                    setFdItemId(e.target.value)
                  }
                }}
              >
                <option value="">Selecionar item...</option>
                {itens.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nome} ({i.unidade}) — {i.fin_categorias?.nome}
                  </option>
                ))}
                <option value="__novo__">+ Criar novo item</option>
              </select>
            </div>

            {fdCriarItem && (
              <>
                <div className="form-group">
                  <label>Nome do item *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={fdNovoItemNome}
                    onChange={e => setFdNovoItemNome(e.target.value)}
                    placeholder="Ex: Arroz"
                  />
                </div>
                <div className="form-group">
                  <label>Categoria *</label>
                  <select className="form-select" value={fdNovoItemCategoria} onChange={e => setFdNovoItemCategoria(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <input
                    className="form-input"
                    type="text"
                    value={fdNovoItemUnidade}
                    onChange={e => setFdNovoItemUnidade(e.target.value)}
                    placeholder="kg, unid, resma..."
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Quantidade *</label>
              <input className="form-input" type="number" min="0.01" step="0.01" value={fdQtd} onChange={e => setFdQtd(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Valor unitário (R$) *</label>
              <input className="form-input" type="text" inputMode="numeric" value={applyMask(fdValor, 'currency')} onChange={e => setFdValor(stripMask(e.target.value))} placeholder="R$ 0,00" />
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input className="form-input" type="date" value={fdData} onChange={e => setFdData(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <input className="form-input" type="text" value={fdObs} onChange={e => setFdObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="financeiro-form-actions">
            <button className="btn btn-success" onClick={onSalvar} disabled={fdSaving}>
              {fdSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      )}

      {despesas.length === 0 ? (
        <p className="fin-empty">Nenhuma despesa registrada.</p>
      ) : (
        <div className="financeiro-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Item</th>
                <th>Categoria</th>
                <th>Qtd</th>
                <th>Valor unit.</th>
                <th>Total</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map(d => (
                <tr key={d.id}>
                  <td>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{d.fin_itens?.nome}</td>
                  <td>{d.fin_itens?.fin_categorias?.nome}</td>
                  <td>{d.quantidade} {d.fin_itens?.unidade}</td>
                  <td>{formatBRL(d.valor_unitario)}</td>
                  <td><strong>{formatBRL(d.quantidade * d.valor_unitario)}</strong></td>
                  <td>{d.observacao || '—'}</td>
                  <td>
                    {confirmandoId === d.id && confirmandoTipo === 'despesa' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-danger" onClick={() => onDeletar(d.id, 'despesa')}>Confirmar?</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setConfirmandoId(null); setConfirmandoTipo(null) }}>Não</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => { setConfirmandoId(d.id); setConfirmandoTipo('despesa') }}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Aba Doações ──────────────────────────────────────────────────────────────

function AbaDoacoes({
  doacoes, itens,
  showForm, setShowForm,
  doTipo, setDoTipo,
  doValor, setDoValor,
  doItemId, setDoItemId,
  doQtd, setDoQtd,
  doDoador, setDoDoador,
  doData, setDoData,
  doObs, setDoObs,
  doSaving, onSalvar, onCancelar,
  confirmandoId, setConfirmandoId, confirmandoTipo, setConfirmandoTipo, onDeletar,
}) {
  return (
    <div>
      <div className="financeiro-toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Doação'}
        </button>
      </div>

      {showForm && (
        <div className="financeiro-form">
          <h3>Nova Doação</h3>
          <div className="financeiro-form-grid">
            <div className="form-group">
              <label>Tipo *</label>
              <select className="form-select" value={doTipo} onChange={e => setDoTipo(e.target.value)}>
                <option value="dinheiro">Dinheiro</option>
                <option value="item">Item</option>
              </select>
            </div>

            {doTipo === 'dinheiro' && (
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input className="form-input" type="text" inputMode="numeric" value={applyMask(doValor, 'currency')} onChange={e => setDoValor(stripMask(e.target.value))} placeholder="R$ 0,00" />
              </div>
            )}

            {doTipo === 'item' && (
              <>
                <div className="form-group">
                  <label>Item *</label>
                  <select className="form-select" value={doItemId} onChange={e => setDoItemId(e.target.value)}>
                    <option value="">Selecionar item...</option>
                    {itens.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nome} ({i.unidade}) — {i.fin_categorias?.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" value={doQtd} onChange={e => setDoQtd(e.target.value)} placeholder="0" />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Doador</label>
              <input className="form-input" type="text" value={doDoador} onChange={e => setDoDoador(e.target.value)} placeholder="Nome (opcional)" />
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input className="form-input" type="date" value={doData} onChange={e => setDoData(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <input className="form-input" type="text" value={doObs} onChange={e => setDoObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="financeiro-form-actions">
            <button className="btn btn-success" onClick={onSalvar} disabled={doSaving}>
              {doSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      )}

      {doacoes.length === 0 ? (
        <p className="fin-empty">Nenhuma doação registrada.</p>
      ) : (
        <div className="financeiro-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Doador</th>
                <th>Tipo</th>
                <th>Valor / Item</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {doacoes.map(d => (
                <tr key={d.id}>
                  <td>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{d.doador || '—'}</td>
                  <td>
                    <span className={`badge badge-${d.tipo === 'dinheiro' ? 'supers' : 'bem_estar'}`}>
                      {d.tipo === 'dinheiro' ? 'Dinheiro' : 'Item'}
                    </span>
                  </td>
                  <td>
                    {d.tipo === 'dinheiro'
                      ? formatBRL(d.valor)
                      : `${d.quantidade} ${d.fin_itens?.unidade} de ${d.fin_itens?.nome}`}
                  </td>
                  <td>{d.observacao || '—'}</td>
                  <td>
                    {confirmandoId === d.id && confirmandoTipo === 'doacao' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-danger" onClick={() => onDeletar(d.id, 'doacao')}>Confirmar?</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setConfirmandoId(null); setConfirmandoTipo(null) }}>Não</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => { setConfirmandoId(d.id); setConfirmandoTipo('doacao') }}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
