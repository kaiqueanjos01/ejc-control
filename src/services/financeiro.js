import { supabase } from '../lib/supabase'

// ─── Helpers puros (testáveis sem Supabase) ───────────────────────────────────

export function calcularTotalPorCategoria(categorias, itens, despesas) {
  return categorias.map(cat => {
    const itensDaCategoria = itens.filter(i => i.categoria_id === cat.id)
    const itemIds = new Set(itensDaCategoria.map(i => i.id))
    const total = despesas
      .filter(d => itemIds.has(d.item_id))
      .reduce((sum, d) => sum + d.quantidade * d.valor_unitario, 0)
    return { ...cat, total, itens: itensDaCategoria }
  })
}

export function calcularTotalDespesas(despesas) {
  return despesas.reduce((sum, d) => sum + d.quantidade * d.valor_unitario, 0)
}

export function calcularTotalDoacoesDinheiro(doacoes) {
  return doacoes
    .filter(d => d.tipo === 'dinheiro')
    .reduce((sum, d) => sum + (d.valor || 0), 0)
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function listarCategorias(encontroId) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data || []
}

export async function criarCategoria(encontroId, nome) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .insert([{ encontro_id: encontroId, nome }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCategoria(id, nome) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .update({ nome })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletarCategoria(id) {
  const { error } = await supabase
    .from('fin_categorias')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Itens ────────────────────────────────────────────────────────────────────

export async function listarItens(encontroId) {
  const { data, error } = await supabase
    .from('fin_itens')
    .select('*, fin_categorias(id, nome)')
    .eq('encontro_id', encontroId)
    .order('nome', { ascending: true })
  if (error) throw error
  return data || []
}

export async function criarItem(encontroId, categoriaId, nome, unidade) {
  const { data, error } = await supabase
    .from('fin_itens')
    .insert([{ encontro_id: encontroId, categoria_id: categoriaId, nome, unidade }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarItem(id, { nome, unidade, categoria_id }) {
  const { data, error } = await supabase
    .from('fin_itens')
    .update({ nome, unidade, categoria_id })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletarItem(id) {
  const { error } = await supabase
    .from('fin_itens')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Despesas ─────────────────────────────────────────────────────────────────

export async function listarDespesas(encontroId) {
  const { data, error } = await supabase
    .from('fin_despesas')
    .select('*, fin_itens(id, nome, unidade, categoria_id, fin_categorias(id, nome))')
    .eq('encontro_id', encontroId)
    .order('data', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarDespesa(encontroId, itemId, quantidade, valorUnitario, data, observacao) {
  const { data: row, error } = await supabase
    .from('fin_despesas')
    .insert([{
      encontro_id: encontroId,
      item_id: itemId,
      quantidade,
      valor_unitario: valorUnitario,
      data,
      observacao: observacao || null,
    }])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function deletarDespesa(id) {
  const { error } = await supabase
    .from('fin_despesas')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Doações ──────────────────────────────────────────────────────────────────

export async function listarDoacoes(encontroId) {
  const { data, error } = await supabase
    .from('fin_doacoes')
    .select('*, fin_itens(id, nome, unidade)')
    .eq('encontro_id', encontroId)
    .order('data', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarDoacao(encontroId, tipo, { valor, itemId, quantidade, doador, data, observacao }) {
  const { data: row, error } = await supabase
    .from('fin_doacoes')
    .insert([{
      encontro_id: encontroId,
      tipo,
      valor: tipo === 'dinheiro' ? valor : null,
      item_id: tipo === 'item' ? itemId : null,
      quantidade: tipo === 'item' ? quantidade : null,
      doador: doador || null,
      data,
      observacao: observacao || null,
    }])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function deletarDoacao(id) {
  const { error } = await supabase
    .from('fin_doacoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
