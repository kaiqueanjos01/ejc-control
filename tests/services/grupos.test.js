import { describe, it, expect } from 'vitest'
import { sugerirGrupos } from '../../src/services/grupos'

describe('sugerirGrupos', () => {
  const grupos = [
    { id: 'g1', nome: 'Azul', criterio_idade_min: 14, criterio_idade_max: 16 },
    { id: 'g2', nome: 'Verde', criterio_idade_min: 17, criterio_idade_max: 19 },
    { id: 'g3', nome: 'Vermelho', criterio_idade_min: 20, criterio_idade_max: null },
  ]

  const anoAtual = new Date().getFullYear()

  it('atribui encontrista de 15 anos ao grupo Azul', () => {
    const encontristas = [{
      id: 'e1',
      dados_extras: { data_nascimento: `${anoAtual - 15}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e1: 'g1' })
  })

  it('atribui encontrista de 18 anos ao grupo Verde', () => {
    const encontristas = [{
      id: 'e2',
      dados_extras: { data_nascimento: `${anoAtual - 18}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e2: 'g2' })
  })

  it('ignora encontrista sem data_nascimento', () => {
    const encontristas = [{ id: 'e3', dados_extras: {} }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({})
  })

  it('ignora encontrista sem dados_extras', () => {
    const encontristas = [{ id: 'e4', dados_extras: null }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({})
  })

  it('atribui encontrista de 25 anos ao grupo Vermelho (sem max)', () => {
    const encontristas = [{
      id: 'e5',
      dados_extras: { data_nascimento: `${anoAtual - 25}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e5: 'g3' })
  })
})
