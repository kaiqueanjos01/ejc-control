import { supabase } from '../lib/supabase'

export async function listarGrupos(encontroId) {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem')
  if (error) throw error
  return data
}

export async function criarGrupo({ encontroId, nome, cor, criterioIdadeMin, criterioIdadeMax, ordem }) {
  const { data, error } = await supabase
    .from('grupos')
    .insert({
      encontro_id: encontroId,
      nome,
      cor,
      criterio_idade_min: criterioIdadeMin ?? null,
      criterio_idade_max: criterioIdadeMax ?? null,
      ordem: ordem ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarGrupo(id, updates) {
  const { data, error } = await supabase
    .from('grupos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerGrupo(id) {
  const { error } = await supabase.from('grupos').delete().eq('id', id)
  if (error) throw error
}

export async function atribuirGrupo(encontristaId, grupoId) {
  const { error } = await supabase
    .from('encontristas')
    .update({ grupo_id: grupoId })
    .eq('id', encontristaId)
  if (error) throw error
}

export function sugerirGrupos(encontristas, grupos) {
  // Retorna map encontristaId → grupoId baseado na data_nascimento (dados_extras)
  // Se não tiver data_nascimento ou critérios, retorna vazio
  const hoje = new Date()
  const result = {}

  for (const e of encontristas) {
    const nascimento = e.dados_extras?.data_nascimento
    if (!nascimento) continue

    const idade = hoje.getFullYear() - new Date(nascimento).getFullYear()
    const grupo = grupos.find(g =>
      (g.criterio_idade_min == null || idade >= g.criterio_idade_min) &&
      (g.criterio_idade_max == null || idade <= g.criterio_idade_max)
    )
    if (grupo) result[e.id] = grupo.id
  }

  return result
}
