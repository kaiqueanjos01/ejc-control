import { supabase } from '../lib/supabase'
import { stripMask } from '../utils/masks'
import { colunaDoDia } from '../utils/checkin'

export async function criarEncontrista({ encontroId, nome, telefone }) {
  const { data, error } = await supabase
    .from('encontristas')
    .insert({ encontro_id: encontroId, nome, telefone })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarEncontristas(encontroId) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function buscarEncontristaPorToken(token) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('token', token)
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontristaPorId(id) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function atualizarEncontrista(id, updates) {
  const { data, error } = await supabase
    .from('encontristas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fazerCheckin(token) {
  const { data, error } = await supabase
    .from('encontristas')
    .update({ checkin_at: new Date().toISOString() })
    .eq('token', token)
    .is('checkin_at', null)
    .select('*, grupos(id, nome, cor)')
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontristasPorNome(encontroId, nome) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
    .ilike('nome', `%${nome}%`)
    .order('nome')
    .limit(10)
  if (error) throw error
  return data
}

/** Filtra encontristas cujo telefone (só dígitos) casa com o informado. Puro. */
export function filtrarPorTelefone(encontristas, telefone) {
  const alvo = stripMask(telefone)
  if (!alvo) return []
  return encontristas.filter((e) => stripMask(e.telefone) === alvo)
}

/** Busca encontristas do encontro que casam com o telefone informado. */
export async function buscarEncontristasPorTelefone(encontroId, telefone) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
  if (error) throw error
  return filtrarPorTelefone(data, telefone)
}

/** Grava o check-in do dia (1 ou 2) e retorna o encontrista com o grupo. */
export async function confirmarCheckin(encontristaId, dia) {
  const coluna = colunaDoDia(dia)
  const { data, error } = await supabase
    .from('encontristas')
    .update({ [coluna]: new Date().toISOString() })
    .eq('id', encontristaId)
    .select('*, grupos(id, nome, cor)')
    .single()
  if (error) throw error
  return data
}

/** Define qual dia (1 ou 2) o auto-check-in por QR registra. */
export async function definirDiaAtivo(encontroId, dia) {
  const { error } = await supabase
    .from('encontros')
    .update({ checkin_dia_ativo: dia })
    .eq('id', encontroId)
  if (error) throw error
}

/** Lê o dia ativo do encontro (default 1). */
export async function buscarDiaAtivo(encontroId) {
  const { data, error } = await supabase
    .from('encontros')
    .select('checkin_dia_ativo')
    .eq('id', encontroId)
    .single()
  if (error) throw error
  return data.checkin_dia_ativo ?? 1
}

export async function excluirEncontrista(id) {
  const { error } = await supabase
    .from('encontristas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
