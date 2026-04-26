import { supabase } from '../lib/supabase'

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
