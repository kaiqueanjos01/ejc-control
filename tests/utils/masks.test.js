import { describe, it, expect } from 'vitest'
import { applyMask, stripMask, MASKED_TYPES } from '../../src/utils/masks'

describe('MASKED_TYPES', () => {
  it('contains all masked types', () => {
    expect(MASKED_TYPES).toEqual(
      expect.arrayContaining(['phone', 'cpf', 'cnpj', 'cep', 'rg', 'currency'])
    )
  })
})

describe('stripMask', () => {
  it('removes all non-digit characters', () => {
    expect(stripMask('(11) 99999-0000')).toBe('11999990000')
    expect(stripMask('123.456.789-09')).toBe('12345678909')
    expect(stripMask('12.345.678/0001-90')).toBe('12345678000190')
    expect(stripMask('01310-100')).toBe('01310100')
  })

  it('returns empty string for falsy values', () => {
    expect(stripMask('')).toBe('')
    expect(stripMask(null)).toBe('')
    expect(stripMask(undefined)).toBe('')
  })
})

describe('applyMask - phone', () => {
  it('formats 11 digits as (XX) XXXXX-XXXX', () => {
    expect(applyMask('11999990000', 'phone')).toBe('(11) 99999-0000')
  })
  it('formats 10 digits as (XX) XXXX-XXXX', () => {
    expect(applyMask('1133334444', 'phone')).toBe('(11) 3333-4444')
  })
  it('formats partially during typing', () => {
    expect(applyMask('11', 'phone')).toBe('(11')
    expect(applyMask('119', 'phone')).toBe('(11) 9')
    expect(applyMask('11999', 'phone')).toBe('(11) 999')
  })
  it('is idempotent on already-masked value', () => {
    expect(applyMask('(11) 99999-0000', 'phone')).toBe('(11) 99999-0000')
  })
  it('returns empty string for empty input', () => {
    expect(applyMask('', 'phone')).toBe('')
  })
})

describe('applyMask - cpf', () => {
  it('formats full CPF', () => {
    expect(applyMask('12345678909', 'cpf')).toBe('123.456.789-09')
  })
  it('formats partially', () => {
    expect(applyMask('123', 'cpf')).toBe('123')
    expect(applyMask('1234', 'cpf')).toBe('123.4')
    expect(applyMask('123456', 'cpf')).toBe('123.456')
    expect(applyMask('1234567', 'cpf')).toBe('123.456.7')
  })
  it('is idempotent on already-masked value', () => {
    expect(applyMask('123.456.789-09', 'cpf')).toBe('123.456.789-09')
  })
})

describe('applyMask - cnpj', () => {
  it('formats full CNPJ', () => {
    expect(applyMask('12345678000190', 'cnpj')).toBe('12.345.678/0001-90')
  })
  it('formats partially', () => {
    expect(applyMask('12', 'cnpj')).toBe('12')
    expect(applyMask('123', 'cnpj')).toBe('12.3')
    expect(applyMask('12345678', 'cnpj')).toBe('12.345.678')
    expect(applyMask('123456780001', 'cnpj')).toBe('12.345.678/0001')
  })
})

describe('applyMask - cep', () => {
  it('formats full CEP', () => {
    expect(applyMask('01310100', 'cep')).toBe('01310-100')
  })
  it('formats partially', () => {
    expect(applyMask('01310', 'cep')).toBe('01310')
    expect(applyMask('013101', 'cep')).toBe('01310-1')
  })
})

describe('applyMask - rg', () => {
  it('formats full RG', () => {
    expect(applyMask('123456789', 'rg')).toBe('12.345.678-9')
  })
  it('formats partially', () => {
    expect(applyMask('12', 'rg')).toBe('12')
    expect(applyMask('123', 'rg')).toBe('12.3')
  })
})

describe('applyMask - currency', () => {
  it('formats digits as BRL cents', () => {
    expect(applyMask('120050', 'currency')).toBe('R$ 1.200,50')
    expect(applyMask('100', 'currency')).toBe('R$ 1,00')
    expect(applyMask('1', 'currency')).toBe('R$ 0,01')
  })
  it('returns empty string for empty input', () => {
    expect(applyMask('', 'currency')).toBe('')
    expect(applyMask('0', 'currency')).toBe('R$ 0,00')
  })
})

describe('applyMask - unknown type', () => {
  it('returns value unchanged', () => {
    expect(applyMask('hello', 'text')).toBe('hello')
    expect(applyMask('42', 'number')).toBe('42')
  })
})
