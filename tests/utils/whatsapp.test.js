import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl } from '../../src/utils/whatsapp'

describe('buildWhatsAppUrl', () => {
  it('substitui {nome} e {telefone} na mensagem', () => {
    const url = buildWhatsAppUrl({
      numero: '5511999990000',
      template: 'Olá! Me chamo {nome}, tel: {telefone}.',
      nome: 'João Silva',
      telefone: '11 99999-0001',
    })
    expect(url).toBe(
      'https://wa.me/5511999990000?text=Ol%C3%A1!%20Me%20chamo%20Jo%C3%A3o%20Silva%2C%20tel%3A%2011%2099999-0001.'
    )
  })

  it('funciona sem variáveis no template', () => {
    const url = buildWhatsAppUrl({
      numero: '5511999990000',
      template: 'Interesse no EJC.',
      nome: 'João',
      telefone: '11 99999-0001',
    })
    expect(url).toContain('wa.me/5511999990000')
    expect(url).toContain('Interesse%20no%20EJC.')
  })

  it('remove espaços e traços do número', () => {
    const url = buildWhatsAppUrl({
      numero: '55 11 9999-0000',
      template: 'teste',
      nome: 'X',
      telefone: 'Y',
    })
    expect(url).toContain('wa.me/55119999000')
  })
})
