import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontro, atualizarEncontro } from '../../services/encontros'
import { listarCampos, criarCampo, removerCampo, reordenarCampos } from '../../services/campos'

export function Configuracoes() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontro, setEncontro] = useState(null)
  const [campos, setCampos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvandoEncontro, setSalvandoEncontro] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [novoCampo, setNovoCampo] = useState({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
  const [adicionandoCampo, setAdicionandoCampo] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([buscarEncontro(encontroId), listarCampos(encontroId)])
      .then(([e, c]) => { setEncontro(e); setCampos(c) })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  async function handleSalvarEncontro(e) {
    e.preventDefault()
    setSalvandoEncontro(true)
    await atualizarEncontro(encontroId, {
      nome: encontro.nome,
      data_inicio: encontro.data_inicio || null,
      data_fim: encontro.data_fim || null,
      whatsapp_numero: encontro.whatsapp_numero,
      whatsapp_mensagem: encontro.whatsapp_mensagem,
    })
    setMensagem('Salvo!')
    setTimeout(() => setMensagem(null), 2000)
    setSalvandoEncontro(false)
  }

  async function handleAdicionarCampo(e) {
    e.preventDefault()
    const chave = novoCampo.chave || novoCampo.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const campo = await criarCampo({
      encontro_id: encontroId,
      label: novoCampo.label,
      chave,
      tipo: novoCampo.tipo,
      obrigatorio: novoCampo.obrigatorio,
      visivel_encontrista: novoCampo.visivel_encontrista,
      visivel_equipe: novoCampo.visivel_equipe,
      ordem: campos.length,
    })
    setCampos(prev => [...prev, campo])
    setNovoCampo({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
    setAdicionandoCampo(false)
  }

  async function handleRemoverCampo(id) {
    if (!confirm('Remover este campo? Os dados já preenchidos em dados_extras não serão apagados.')) return
    await removerCampo(id)
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  async function handleMoverCampo(index, direcao) {
    const novo = [...campos]
    const alvo = index + direcao
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    const comOrdem = novo.map((c, i) => ({ ...c, ordem: i }))
    setCampos(comOrdem)
    await reordenarCampos(comOrdem.map(c => ({ id: c.id, ordem: c.ordem })))
  }

  const urlPreFicha = `${window.location.origin}/inscricao/${encontroId}`

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Configurações do Encontro</h2>

      {/* Dados do encontro */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 12, fontWeight: 600 }}>DADOS DO ENCONTRO</h3>
        <form onSubmit={handleSalvarEncontro} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Campo label="Nome">
            <input value={encontro.nome} onChange={e => setEncontro(p => ({ ...p, nome: e.target.value }))} style={inputStyle} />
          </Campo>
          <div style={{ display: 'flex', gap: 10 }}>
            <Campo label="Data início" style={{ flex: 1 }}>
              <input type="date" value={encontro.data_inicio ?? ''} onChange={e => setEncontro(p => ({ ...p, data_inicio: e.target.value }))} style={inputStyle} />
            </Campo>
            <Campo label="Data fim" style={{ flex: 1 }}>
              <input type="date" value={encontro.data_fim ?? ''} onChange={e => setEncontro(p => ({ ...p, data_fim: e.target.value }))} style={inputStyle} />
            </Campo>
          </div>
          <Campo label="Número WhatsApp (com código do país, sem espaços)">
            <input placeholder="5511999990000" value={encontro.whatsapp_numero} onChange={e => setEncontro(p => ({ ...p, whatsapp_numero: e.target.value }))} style={inputStyle} />
          </Campo>
          <Campo label="Mensagem — use {nome} e {telefone}">
            <textarea value={encontro.whatsapp_mensagem} onChange={e => setEncontro(p => ({ ...p, whatsapp_mensagem: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Campo>
          {mensagem && <p style={{ color: '#52b788', fontSize: 13 }}>{mensagem}</p>}
          <button type="submit" disabled={salvandoEncontro} style={btnStyle}>
            {salvandoEncontro ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>

      {/* QR Code da pré-ficha */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 12, fontWeight: 600 }}>QR CODE — PRÉ-FICHA</h3>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{urlPreFicha}</p>
        <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 8 }}>
          <QRCodeSVG value={urlPreFicha} size={160} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => navigator.clipboard.writeText(urlPreFicha)} style={btnSecStyle}>
            Copiar link
          </button>
        </div>
      </section>

      {/* Construtor de formulário */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>CAMPOS DO FORMULÁRIO</h3>
          <button onClick={() => setAdicionandoCampo(true)} style={btnStyle}>+ Campo</button>
        </div>

        {adicionandoCampo && (
          <form onSubmit={handleAdicionarCampo} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Label (ex: Data de Nascimento)" value={novoCampo.label} onChange={e => setNovoCampo(p => ({ ...p, label: e.target.value }))} required style={{ ...inputStyle, flex: 2 }} />
              <select value={novoCampo.tipo} onChange={e => setNovoCampo(p => ({ ...p, tipo: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                <option value="text">Texto</option>
                <option value="date">Data</option>
                <option value="phone">Telefone</option>
                <option value="number">Número</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <label><input type="checkbox" checked={novoCampo.obrigatorio} onChange={e => setNovoCampo(p => ({ ...p, obrigatorio: e.target.checked }))} /> Obrigatório</label>
              <label><input type="checkbox" checked={novoCampo.visivel_encontrista} onChange={e => setNovoCampo(p => ({ ...p, visivel_encontrista: e.target.checked }))} /> Visível ao encontrista</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btnStyle}>Adicionar</button>
              <button type="button" onClick={() => setAdicionandoCampo(false)} style={btnSecStyle}>Cancelar</button>
            </div>
          </form>
        )}

        {campos.length === 0 && !adicionandoCampo && (
          <p style={{ color: '#555', fontSize: 13 }}>Nenhum campo adicional. Clique em "+ Campo" para adicionar.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {campos.map((campo, i) => (
            <div key={campo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #222', background: '#111' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{campo.label}</span>
                <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{campo.tipo}</span>
                {campo.obrigatorio && <span style={{ fontSize: 11, color: '#f87171', marginLeft: 8 }}>*obrigatório</span>}
                {campo.visivel_encontrista && <span style={{ fontSize: 11, color: '#52b788', marginLeft: 8 }}>encontrista</span>}
              </div>
              <button onClick={() => handleMoverCampo(i, -1)} disabled={i === 0} style={iconBtn}>↑</button>
              <button onClick={() => handleMoverCampo(i, 1)} disabled={i === campos.length - 1} style={iconBtn}>↓</button>
              <button onClick={() => handleRemoverCampo(campo.id)} style={{ ...iconBtn, color: '#f87171' }}>✕</button>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  )
}

function Campo({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #333', background: '#0f0f0f', color: '#e0e0e0', fontSize: 13,
}
const btnStyle = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer',
}
const iconBtn = {
  background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: '2px 6px',
}
