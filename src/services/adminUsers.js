import { supabase } from '../lib/supabase'
import { generatePassword } from '../utils/crypto'

// Permissões por role
export const ROLE_PERMISSIONS = {
  admin: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canViewInvites: true,
    canCreateInvites: true,
    canDeleteInvites: true,
  },
  moderador: {
    canViewUsers: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewInvites: false,
    canCreateInvites: false,
    canDeleteInvites: false,
  },
  visualizador: {
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canViewInvites: false,
    canCreateInvites: false,
    canDeleteInvites: false,
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
export function verificarPermissao(userRole, acao) {
  const permissoes = ROLE_PERMISSIONS[userRole]
  return permissoes && permissoes[acao]
}

// Criar novo convite de admin
export async function criarConviteAdmin(email, role = 'moderador') {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user.role, 'canCreateInvites')) {
      throw new Error('Você não tem permissão para criar convites')
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
    // Verificar se convite é válido
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .select('*')
      .eq('token', token)
      .is('usado_em', null)
      .gt('expira_em', new Date().toISOString())
      .single()

    if (inviteError || !invite) throw new Error('Convite inválido ou expirado')
    if (invite.email !== email) throw new Error('Email não corresponde ao convite')

    // Criar usuário no Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (authError) throw authError
    if (!authUser.user) throw new Error('Erro ao criar usuário')

    // Criar registro em admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .insert([
        {
          auth_user_id: authUser.user.id,
          email,
          nome,
          role: invite.role,
          criado_por: invite.criado_por,
        },
      ])
      .select()
      .single()

    if (adminError) throw adminError

    // Marcar convite como usado
    await supabase
      .from('admin_invites')
      .update({ usado_em: new Date().toISOString() })
      .eq('id', invite.id)

    return adminUser
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
    if (!verificarPermissao(user.role, 'canDeleteInvites')) {
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
    if (!verificarPermissao(user.role, 'canEditUsers')) {
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
    if (!verificarPermissao(user.role, 'canDeleteUsers')) {
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
  return crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => {
    return acc + byte.toString(16).padStart(2, '0')
  }, '')
}

// Descrições dos roles
export const ROLE_DESCRIPTIONS = {
  admin: 'Acesso total - criar, editar e deletar usuários',
  moderador: 'Pode visualizar usuários mas não pode gerenciar',
  visualizador: 'Acesso somente leitura ao sistema',
}
