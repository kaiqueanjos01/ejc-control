import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, X, Plus, Layers } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarCampos, criarCampo, removerCampo, reordenarCampos } from '../../services/campos'
import './Formulario.css'

const TIPO_LABELS = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  phone: 'Telefone',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  cep: 'CEP',
  rg: 'RG',
  date: 'Data',
  currency: 'Valor (R$)',
  select: 'Seleção',
  checkbox: 'Sim / Não',
}

export function Formulario() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [campos, setCampos] = useState([])
  const [secoes, setSecoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [adicionandoEmSecao, setAdicionandoEmSecao] = useState(null)
  const [novoCampo, setNovoCampo] = useState({
    label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [],
  })
  const [novaOpcao, setNovaOpcao] = useState('')
  const [novaSecaoNome, setNovaSecaoNome] = useState('')
  const [criandoSecao, setCriandoSecao] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    listarCampos(encontroId).then(data => {
      setCampos(data)
      const ordemVista = []
      for (const c of data) {
        const s = c.secao || 'Geral'
        if (!ordemVista.includes(s)) ordemVista.push(s)
      }
      setSecoes(ordemVista)
    }).finally(() => setLoading(false))
  }, [encontroId, navigate])

  function camposDaSecao(secao) {
    return campos.filter(c => (c.secao || 'Geral') === secao)
  }

  function indexGlobal(campo) {
    return campos.findIndex(c => c.id === campo.id)
  }

  function adicionarOpcao() {
    const op = novaOpcao.trim()
    if (!op || novoCampo.opcoes.includes(op)) return
    setNovoCampo(p => ({ ...p, opcoes: [...p.opcoes, op] }))
    setNovaOpcao('')
  }

  function removerOpcao(index) {
    setNovoCampo(p => ({ ...p, opcoes: p.opcoes.filter((_, i) => i !== index) }))
  }

  async function handleAdicionarSecao(e) {
    e.preventDefault()
    const nome = novaSecaoNome.trim()
    if (!nome || secoes.includes(nome)) return
    setSecoes(prev => [...prev, nome])
    setNovaSecaoNome('')
    setCriandoSecao(false)
    setAdicionandoEmSecao(nome)
  }

  async function handleRemoverSecao(secao) {
    const camposSecao = camposDaSecao(secao)
    if (camposSecao.length > 0) {
      if (!confirm(`Remover a seção "${secao}" e seus ${camposSecao.length} campo(s)?`)) return
      await Promise.all(camposSecao.map(c => removerCampo(c.id)))
      setCampos(prev => prev.filter(c => (c.secao || 'Geral') !== secao))
    }
    setSecoes(prev => prev.filter(s => s !== secao))
  }

  async function handleAdicionarCampo(e) {
    e.preventDefault()
    if (novoCampo.tipo === 'select' && novoCampo.opcoes.length === 0) {
      alert('Adicione ao menos uma opção para o campo de seleção.')
      return
    }
    const chave = novoCampo.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const campo = await criarCampo({
      encontro_id: encontroId,
      label: novoCampo.label,
      chave,
      tipo: novoCampo.tipo,
      opcoes: novoCampo.tipo === 'select' ? novoCampo.opcoes : null,
      obrigatorio: novoCampo.obrigatorio,
      visivel_encontrista: novoCampo.visivel_encontrista,
      visivel_equipe: true,
      secao: adicionandoEmSecao === 'Geral' ? null : adicionandoEmSecao,
      ordem: campos.length,
    })
    setCampos(prev => [...prev, campo])
    setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] })
    setNovaOpcao('')
    setAdicionandoEmSecao(null)
  }

  async function handleRemoverCampo(id) {
    if (!confirm('Remover este campo?')) return
    await removerCampo(id)
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  async function handleMover(index, direcao) {
    const novo = [...campos]
    const alvo = index + direcao
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    const comOrdem = novo.map((c, i) => ({ ...c, ordem: i }))
    setCampos(comOrdem)
    await reordenarCampos(comOrdem.map(c => ({ id: c.id, ordem: c.ordem })))
  }

  function cancelarForm() {
    setAdicionandoEmSecao(null)
    setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] })
    setNovaOpcao('')
  }

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="formulario-header">
        <div>
          <h2 className="formulario-title">Campos do Formulário</h2>
          <p className="formulario-subtitle">Organize o formulário em seções e adicione campos a cada uma</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCriandoSecao(true)}
          disabled={criandoSecao}
        >
          <Layers size={14} /> Nova seção
        </button>
      </div>

      {criandoSecao && (
        <form onSubmit={handleAdicionarSecao} className="formulario-nova-secao-form">
          <input
            className="form-input"
            placeholder="Nome da seção (ex: Dados Pessoais)"
            value={novaSecaoNome}
            onChange={e => setNovaSecaoNome(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Criar</button>
          <button type="button" className="btn btn-secondary" onClick={() => setCriandoSecao(false)}>Cancelar</button>
        </form>
      )}

      {secoes.length === 0 && !criandoSecao && (
        <div className="formulario-empty">
          <Layers size={32} strokeWidth={1.5} />
          <p>Nenhuma seção criada. Clique em "+ Nova seção" para começar.</p>
        </div>
      )}

      <div className="formulario-secoes">
        {secoes.map(secao => {
          const camposSecao = camposDaSecao(secao)
          const aberta = adicionandoEmSecao === secao
          return (
            <div key={secao} className="formulario-secao">
              <div className="formulario-secao-header">
                <div className="formulario-secao-header-left">
                  <span className="formulario-secao-title">{secao}</span>
                  <span className="formulario-secao-count">{camposSecao.length} campo{camposSecao.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                  className="config-icon-btn config-icon-btn--danger"
                  onClick={() => handleRemoverSecao(secao)}
                  title="Remover seção"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="formulario-secao-body">
                {camposSecao.length === 0 && !aberta && (
                  <p className="formulario-secao-empty">Nenhum campo. Adicione um abaixo.</p>
                )}

                {camposSecao.map(campo => {
                  const gi = indexGlobal(campo)
                  return (
                    <div key={campo.id} className="config-field-item">
                      <div className="config-field-info">
                        <span className="config-field-label">{campo.label}</span>
                        <span className="config-field-type">{TIPO_LABELS[campo.tipo] ?? campo.tipo}</span>
                        {campo.obrigatorio && <span className="config-field-required">*obrigatório</span>}
                        {campo.visivel_encontrista && <span className="config-field-visibility">encontrista</span>}
                      </div>
                      <div className="config-field-actions">
                        <button onClick={() => handleMover(gi, -1)} disabled={gi === 0} className="config-icon-btn" aria-label="Mover para cima">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => handleMover(gi, 1)} disabled={gi === campos.length - 1} className="config-icon-btn" aria-label="Mover para baixo">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => handleRemoverCampo(campo.id)} className="config-icon-btn config-icon-btn--danger" aria-label="Remover">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {aberta && (
                  <form onSubmit={handleAdicionarCampo} className="formulario-campo-inline">
                    <div className="formulario-campo-inline-row">
                      <div className="form-group" style={{ margin: 0, flex: 2 }}>
                        <label className="form-label">Label</label>
                        <input
                          placeholder="ex: Data de Nascimento"
                          value={novoCampo.label}
                          onChange={e => setNovoCampo(p => ({ ...p, label: e.target.value }))}
                          required
                          autoFocus
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label className="form-label">Tipo</label>
                        <select
                          value={novoCampo.tipo}
                          onChange={e => {
                            const tipo = e.target.value
                            setNovoCampo(p => ({ ...p, tipo, opcoes: tipo === 'select' ? p.opcoes : [] }))
                            if (tipo !== 'select') setNovaOpcao('')
                          }}
                          className="form-select"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Texto longo</option>
                          <option value="number">Número</option>
                          <option value="phone">Telefone</option>
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="cep">CEP</option>
                          <option value="rg">RG</option>
                          <option value="date">Data</option>
                          <option value="currency">Valor (R$)</option>
                          <option value="select">Seleção</option>
                          <option value="checkbox">Sim / Não</option>
                        </select>
                      </div>
                    </div>

                    {novoCampo.tipo === 'select' && (
                      <div className="formulario-opcoes">
                        <label className="form-label">Opções *</label>
                        {novoCampo.opcoes.map((op) => (
                          <div key={op} className="formulario-opcao-item">
                            <span>{op}</span>
                            <button
                              type="button"
                              className="config-icon-btn config-icon-btn--danger"
                              onClick={() => removerOpcao(i)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="formulario-opcao-add">
                          <input
                            className="form-input"
                            placeholder="Nova opção..."
                            value={novaOpcao}
                            onChange={e => setNovaOpcao(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarOpcao() } }}
                          />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarOpcao}>
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="config-field-checkboxes">
                      <label className="config-checkbox-label">
                        <input
                          type="checkbox"
                          checked={novoCampo.obrigatorio}
                          onChange={e => setNovoCampo(p => ({ ...p, obrigatorio: e.target.checked }))}
                        />
                        Obrigatório
                      </label>
                      <label className="config-checkbox-label">
                        <input
                          type="checkbox"
                          checked={novoCampo.visivel_encontrista}
                          onChange={e => setNovoCampo(p => ({ ...p, visivel_encontrista: e.target.checked }))}
                        />
                        Visível ao encontrista
                      </label>
                    </div>
                    <div className="config-form-actions">
                      <button type="submit" className="btn btn-primary">Adicionar campo</button>
                      <button type="button" className="btn btn-secondary" onClick={cancelarForm}>Cancelar</button>
                    </div>
                  </form>
                )}

                {!aberta && (
                  <button
                    className="formulario-add-campo-btn"
                    onClick={() => { setAdicionandoEmSecao(secao); setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] }) }}
                  >
                    <Plus size={13} /> Adicionar campo
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AdminLayout>
  )
}
