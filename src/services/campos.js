import { supabase } from '../lib/supabase'

export async function listarCampos(encontroId) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem')
  if (error) throw error
  return data
}

export async function criarCampo(campo) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .insert(campo)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCampo(id, updates) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerCampo(id) {
  const { error } = await supabase.from('campos_formulario').delete().eq('id', id)
  if (error) throw error
}

export async function reordenarCampos(campos) {
  // campos: array de { id, ordem }
  const updates = campos.map(({ id, ordem }) =>
    supabase.from('campos_formulario').update({ ordem }).eq('id', id)
  )
  await Promise.all(updates)
}
