import { supabase } from '../lib/supabase'

export async function listarEncontros() {
  const { data, error } = await supabase
    .from('encontros')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function criarEncontro(encontro) {
  const { data, error } = await supabase
    .from('encontros')
    .insert(encontro)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontro(id) {
  const { data, error } = await supabase
    .from('encontros')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function atualizarEncontro(id, updates) {
  const { data, error } = await supabase
    .from('encontros')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
