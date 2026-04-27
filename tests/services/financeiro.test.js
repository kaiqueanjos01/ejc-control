import { describe, it, expect } from 'vitest'
import {
  calcularTotalPorCategoria,
  calcularTotalDespesas,
  calcularTotalDoacoesDinheiro,
} from '../../src/services/financeiro'

const categorias = [
  { id: 'cat-1', nome: 'Cozinha', ordem: 0 },
  { id: 'cat-2', nome: 'Limpeza', ordem: 1 },
]

const itens = [
  { id: 'item-1', categoria_id: 'cat-1', nome: 'Arroz', unidade: 'kg' },
  { id: 'item-2', categoria_id: 'cat-1', nome: 'Feijão', unidade: 'kg' },
  { id: 'item-3', categoria_id: 'cat-2', nome: 'Detergente', unidade: 'unid' },
]

const despesas = [
  { id: 'd-1', item_id: 'item-1', quantidade: 10, valor_unitario: 5 },   // 50
  { id: 'd-2', item_id: 'item-2', quantidade: 5,  valor_unitario: 8 },   // 40
  { id: 'd-3', item_id: 'item-3', quantidade: 3,  valor_unitario: 2.5 }, // 7.5
]

describe('calcularTotalPorCategoria', () => {
  it('soma corretamente os totais de cada categoria', () => {
    const resultado = calcularTotalPorCategoria(categorias, itens, despesas)
    expect(resultado).toHaveLength(2)

    const cozinha = resultado.find(r => r.id === 'cat-1')
    expect(cozinha.total).toBeCloseTo(90) // 50 + 40

    const limpeza = resultado.find(r => r.id === 'cat-2')
    expect(limpeza.total).toBeCloseTo(7.5)
  })

  it('retorna total zero para categoria sem despesas', () => {
    const resultado = calcularTotalPorCategoria(
      [{ id: 'cat-vazia', nome: 'Vazia', ordem: 0 }],
      [],
      []
    )
    expect(resultado[0].total).toBe(0)
  })

  it('inclui lista de itens da categoria no resultado', () => {
    const resultado = calcularTotalPorCategoria(categorias, itens, despesas)
    const cozinha = resultado.find(r => r.id === 'cat-1')
    expect(cozinha.itens).toHaveLength(2)
    expect(cozinha.itens.map(i => i.id)).toContain('item-1')
    expect(cozinha.itens.map(i => i.id)).toContain('item-2')
  })
})

describe('calcularTotalDespesas', () => {
  it('soma quantidade * valor_unitario de todas as despesas', () => {
    expect(calcularTotalDespesas(despesas)).toBeCloseTo(97.5)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcularTotalDespesas([])).toBe(0)
  })
})

describe('calcularTotalDoacoesDinheiro', () => {
  const doacoes = [
    { id: 'do-1', tipo: 'dinheiro', valor: 100 },
    { id: 'do-2', tipo: 'item',     valor: null, item_id: 'item-1', quantidade: 2 },
    { id: 'do-3', tipo: 'dinheiro', valor: 50 },
  ]

  it('soma apenas as doações do tipo dinheiro', () => {
    expect(calcularTotalDoacoesDinheiro(doacoes)).toBe(150)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcularTotalDoacoesDinheiro([])).toBe(0)
  })

  it('retorna 0 quando não há doações em dinheiro', () => {
    const soDoacoesItem = [
      { id: 'do-1', tipo: 'item', valor: null, item_id: 'item-1', quantidade: 2 },
    ]
    expect(calcularTotalDoacoesDinheiro(soDoacoesItem)).toBe(0)
  })
})
