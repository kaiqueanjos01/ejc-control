import { supabase } from '../lib/supabase'

// Permissões por role
const TEAM_ROLES = ['equipe_externa', 'bem_estar', 'supers']
const COORD_INVITE_PERMISSIONS = ['canViewInvites', 'canCreateInvites', 'canDeleteInvites']

export const ROLE_PERMISSIONS = {
  admin: {
    canViewUsers: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: true,
    canViewInvites: true, canCreateInvites: true, canDeleteInvites: true,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: true,
    canViewEquipe: true,
    canViewFinanceiro: true,
  },
  moderador: {
    canViewUsers: true, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
    canViewFinanceiro: false,
  },
  visualizador: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
    canViewFinanceiro: false,
  },
  equipe_externa: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false,
  },
  bem_estar: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false,
  },
  supers: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false,
  },
}

// Listar todos os admin users
export async function listarAdmins() {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao listar admins:', error)
    throw error
  }
}

// Obter admin atual (baseado no auth user)
export async function obterAdminAtual() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('ativo', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Erro ao obter admin atual:', error)
    return null
  }
}

// Verificar se usuário tem permissão
export function verificarPermissao(user, acao) {
  const role = user?.role
  const permissoes = ROLE_PERMISSIONS[role]
  if (!permissoes) return false
  if (user?.is_coord && TEAM_ROLES.includes(role) && COORD_INVITE_PERMISSIONS.includes(acao)) {
    return true
  }
  return permissoes[acao] ?? false
}

// Criar novo convite de admin
export async function criarConviteAdmin(email, role = 'moderador', isCoord = false) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canCreateInvites')) {
      throw new Error('Você não tem permissão para criar convites')
    }

    if (TEAM_ROLES.includes(user.role) && user.is_coord) {
      if (role !== user.role) throw new Error('Você só pode convidar membros para sua própria equipe')
      if (isCoord) throw new Error('Coordenadores não podem criar outros coordenadores')
    }

    // Gerar token único
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { data, error } = await supabase
      .from('admin_invites')
      .insert([
        {
          email,
          token,
          role,
          is_coord: isCoord,
          expira_em: expiresAt.toISOString(),
          criado_por: user.id,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar convite:', error)
    throw error
  }
}

// Listar convites ativos
export async function listarConvites() {
  try {
    const { data, error } = await supabase
      .from('admin_invites')
      .select('*')
      .is('usado_em', null)
      .gt('expira_em', new Date().toISOString())
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao listar convites:', error)
    throw error
  }
}

// Aceitar convite e criar conta
export async function aceitarConvite(token, email, nome, senha) {
  try {
    // 1. Verificar convite antes de criar auth user (evita órfãos)
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .select('id, email, role')
      .eq('token', token)
      .is('usado_em', null)
      .gt('expira_em', new Date().toISOString())
      .single()

    if (inviteError || !invite) throw new Error('Convite inválido ou expirado')
    if (invite.email !== email) throw new Error('Email não corresponde ao convite')

    // 2. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao criar usuário')

    // 3. Chamar função SECURITY DEFINER — cria admin_users e marca convite
    const { data, error: fnError } = await supabase.rpc('aceitar_convite', {
      p_token: token,
      p_auth_user_id: authData.user.id,
      p_email: email,
      p_nome: nome,
    })

    if (fnError) throw fnError
    return data?.[0] ?? data
  } catch (error) {
    console.error('Erro ao aceitar convite:', error)
    throw error
  }
}

// Deletar convite
export async function deletarConvite(inviteId) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canDeleteInvites')) {
      throw new Error('Você não tem permissão para deletar convites')
    }

    const { error } = await supabase
      .from('admin_invites')
      .delete()
      .eq('id', inviteId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar convite:', error)
    throw error
  }
}

// Atualizar role de admin
export async function atualizarAdminRole(adminId, novoRole) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canEditUsers')) {
      throw new Error('Você não tem permissão para editar usuários')
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update({
        role: novoRole,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', adminId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar role:', error)
    throw error
  }
}

// Deletar admin
export async function deletarAdmin(adminId) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canDeleteUsers')) {
      throw new Error('Você não tem permissão para deletar usuários')
    }

    // Soft delete - marcar como inativo
    const { error } = await supabase
      .from('admin_users')
      .update({ ativo: false })
      .eq('id', adminId)

    if (error) throw error
  } catch (error) {
    console.error('Erro ao deletar admin:', error)
    throw error
  }
}

// Função auxiliar para gerar token de convite
function generateInviteToken() {
  // Gerar string aleatória de 32 caracteres
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// Descrições dos roles
export const ROLE_DESCRIPTIONS = {
  admin: 'Acesso total — cria, edita e deleta usuários',
  moderador: 'Visualiza CRM, grupos e check-in',
  visualizador: 'Acesso somente leitura',
  equipe_externa: 'Gestão do CRM de encontristas',
  bem_estar: 'Gestão do check-in e acompanhamento',
  supers: 'Gestão dos grupos',
}

export const ROLE_LABELS = {
  admin: 'Admin',
  moderador: 'Moderador',
  visualizador: 'Visualizador',
  equipe_externa: 'Equipe Externa',
  bem_estar: 'Bem Estar',
  supers: 'Supers',
}

export async function atualizarAdminCoord(adminId, isCoord) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canEditUsers')) {
      throw new Error('Você não tem permissão para editar usuários')
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_coord: isCoord, atualizado_em: new Date().toISOString() })
      .eq('id', adminId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar is_coord:', error)
    throw error
  }
}
