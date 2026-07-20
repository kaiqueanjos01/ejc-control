import { supabase } from '../lib/supabase'
import { calcularIdadePorDadosExtras } from '../utils/idade'

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
  // Retorna map encontristaId → grupoId baseado na data de nascimento (dados_extras).
  // A chave do campo varia por encontro (slug do label), então buscamos por
  // qualquer chave contendo "nascimento". Sem data ou critérios, retorna vazio.
  const result = {}

  for (const e of encontristas) {
    const idade = calcularIdadePorDadosExtras(e.dados_extras)
    if (idade == null) continue

    const grupo = grupos.find(g =>
      (g.criterio_idade_min == null || idade >= g.criterio_idade_min) &&
      (g.criterio_idade_max == null || idade <= g.criterio_idade_max)
    )
    if (grupo) result[e.id] = grupo.id
  }

  return result
}
