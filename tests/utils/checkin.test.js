import { describe, it, expect } from 'vitest'
import { colunaDoDia, estaPresente, fezCheckinNoDia } from '../../src/utils/checkin'

describe('colunaDoDia', () => {
  it('mapeia dia 1 e dia 2 para as colunas corretas', () => {
    expect(colunaDoDia(1)).toBe('checkin_dia1_at')
    expect(colunaDoDia(2)).toBe('checkin_dia2_at')
  })

  it('trata qualquer valor diferente de 2 como dia 1', () => {
    expect(colunaDoDia(undefined)).toBe('checkin_dia1_at')
  })
})

describe('estaPresente', () => {
  it('é true quando qualquer dia está preenchido', () => {
    expect(estaPresente({ checkin_dia1_at: '2026-07-24T10:00:00Z', checkin_dia2_at: null })).toBe(true)
    expect(estaPresente({ checkin_dia1_at: null, checkin_dia2_at: '2026-07-25T10:00:00Z' })).toBe(true)
  })

  it('é false quando nenhum dia está preenchido', () => {
    expect(estaPresente({ checkin_dia1_at: null, checkin_dia2_at: null })).toBe(false)
    expect(estaPresente(null)).toBe(false)
  })
})

describe('fezCheckinNoDia', () => {
  it('reflete só o dia consultado', () => {
    const e = { checkin_dia1_at: '2026-07-24T10:00:00Z', checkin_dia2_at: null }
    expect(fezCheckinNoDia(e, 1)).toBe(true)
    expect(fezCheckinNoDia(e, 2)).toBe(false)
  })
})
