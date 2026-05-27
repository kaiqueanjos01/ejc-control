import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  }
})

import { excluirEncontrista } from '../../src/services/encontristas'
import { supabase } from '../../src/lib/supabase'

describe('excluirEncontrista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama delete na tabela encontristas com o id correto', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    supabase.from = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: mockEq,
      })),
    }))

    await excluirEncontrista('abc-123')
    expect(supabase.from).toHaveBeenCalledWith('encontristas')
    expect(mockEq).toHaveBeenCalledWith('id', 'abc-123')
  })

  it('não lança erro quando a operação tem sucesso', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    supabase.from = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: mockEq,
      })),
    }))

    await expect(excluirEncontrista('abc-123')).resolves.toBeUndefined()
  })

  it('lança o erro retornado pelo Supabase', async () => {
    const err = new Error('RLS negado')
    const mockEq = vi.fn().mockResolvedValue({ error: err })
    supabase.from = vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: mockEq,
      })),
    }))

    await expect(excluirEncontrista('abc-123')).rejects.toThrow('RLS negado')
  })
})
