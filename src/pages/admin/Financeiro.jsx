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
} from '../../services/financeiro'
import { FinanceiroConfig } from '../../components/FinanceiroConfig'
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
        const novoItem = await criarItem(encontroId, fdNovoItemCategoria, fdNovoItemNome.trim(), fdNovoItemUnidade)
        itemId = novoItem.id
      }
      if (!itemId) { setError('Selecione um item'); return }
      if (!fdQtd || !fdValor) { setError('Quantidade e valor são obrigatórios'); return }
      await criarDespesa(encontroId, itemId, parseFloat(fdQtd), parseFloat(fdValor), fdData, fdObs)
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
        valor: doTipo === 'dinheiro' ? parseFloat(doValor) : null,
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

        {error && <div className="admin-error" style={{ marginBottom: 16 }}>{error}<button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></div>}

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

function AbaResumo({ resumo, despesas, totalDespesas, totalDoacoesDinheiro }) {
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
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Sem despesas</p>
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
    </>
  )
}
