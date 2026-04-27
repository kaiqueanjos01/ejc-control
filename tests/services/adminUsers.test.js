import { describe, it, expect } from 'vitest'
import { ROLE_PERMISSIONS, verificarPermissao } from '../../src/services/adminUsers'

describe('ROLE_PERMISSIONS', () => {
  it('admin tem acesso total a tudo', () => {
    const p = ROLE_PERMISSIONS.admin
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(true)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(true)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(true)
    expect(p.canViewFormulario).toBe(true)
    expect(p.canViewEquipe).toBe(true)
    expect(p.canCreateInvites).toBe(true)
  })

  it('equipe_externa tem acesso total ao CRM e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.equipe_externa
    expect(p.canEditCRM).toBe(true)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(false)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(false)
    expect(p.canViewEquipe).toBe(true)
    expect(p.canViewFormulario).toBe(false)
    expect(p.canCreateInvites).toBe(false)
  })

  it('bem_estar tem acesso total ao check-in e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.bem_estar
    expect(p.canEditCheckin).toBe(true)
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(false)
    expect(p.canViewEquipe).toBe(true)
  })

  it('supers tem acesso total a grupos e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.supers
    expect(p.canEditGrupos).toBe(true)
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(false)
    expect(p.canViewEquipe).toBe(true)
  })

  it('moderador só visualiza CRM, grupos e check-in', () => {
    const p = ROLE_PERMISSIONS.moderador
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewFormulario).toBe(false)
    expect(p.canViewEquipe).toBe(false)
  })
})

describe('verificarPermissao', () => {
  it('admin pode criar convites', () => {
    expect(verificarPermissao({ role: 'admin', is_coord: false }, 'canCreateInvites')).toBe(true)
  })

  it('membro de equipe NÃO pode criar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: false }, 'canCreateInvites')).toBe(false)
  })

  it('coordenador de equipe PODE criar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canCreateInvites')).toBe(true)
    expect(verificarPermissao({ role: 'bem_estar', is_coord: true }, 'canCreateInvites')).toBe(true)
    expect(verificarPermissao({ role: 'supers', is_coord: true }, 'canCreateInvites')).toBe(true)
  })

  it('coordenador de equipe PODE deletar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canDeleteInvites')).toBe(true)
  })

  it('coordenador de equipe PODE visualizar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canViewInvites')).toBe(true)
  })

  it('coordenador de equipe NÃO pode editar usuários', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canEditUsers')).toBe(false)
  })

  it('role inválido retorna false', () => {
    expect(verificarPermissao({ role: 'fantasma', is_coord: false }, 'canViewCRM')).toBe(false)
  })
})

describe('canViewFinanceiro', () => {
  it('admin pode ver financeiro', () => {
    expect(ROLE_PERMISSIONS.admin.canViewFinanceiro).toBe(true)
  })

  it('nenhum outro role pode ver financeiro', () => {
    const outrosRoles = ['moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers']
    outrosRoles.forEach(role => {
      expect(ROLE_PERMISSIONS[role].canViewFinanceiro).toBe(false)
    })
  })

  it('verificarPermissao admin retorna true para financeiro', () => {
    expect(verificarPermissao({ role: 'admin', is_coord: false }, 'canViewFinanceiro')).toBe(true)
  })

  it('verificarPermissao moderador retorna false para financeiro', () => {
    expect(verificarPermissao({ role: 'moderador', is_coord: false }, 'canViewFinanceiro')).toBe(false)
  })
})