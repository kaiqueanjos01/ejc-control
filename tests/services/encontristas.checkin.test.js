import { describe, it, expect } from 'vitest'
import { filtrarPorTelefone } from '../../src/services/encontristas'

describe('filtrarPorTelefone', () => {
  const lista = [
    { id: 'a', nome: 'Ana', telefone: '(11) 98888-7777' },
    { id: 'b', nome: 'Bruno', telefone: '11988887777' },
    { id: 'c', nome: 'Carla', telefone: '(21) 90000-0000' },
  ]

  it('casa ignorando máscara (compara só dígitos)', () => {
    const r = filtrarPorTelefone(lista, '11 98888-7777')
    expect(r.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('retorna vazio quando nada casa', () => {
    expect(filtrarPorTelefone(lista, '31999999999')).toEqual([])
  })

  it('retorna vazio para telefone sem dígitos', () => {
    expect(filtrarPorTelefone(lista, '')).toEqual([])
    expect(filtrarPorTelefone(lista, '  ')).toEqual([])
  })
})
