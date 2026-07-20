import { describe, it, expect } from 'vitest'
import { calcularIdade, calcularIdadePorDadosExtras } from '../../src/utils/idade'

describe('calcularIdade', () => {
  // Data de referência fixa para tornar os testes determinísticos: 20/07/2026
  const hoje = new Date(2026, 6, 20)

  it('calcula a idade quando o aniversário já passou no ano', () => {
    expect(calcularIdade('2001-01-01', hoje)).toBe(25)
  })

  it('não conta o ano corrente quando o aniversário ainda não chegou', () => {
    expect(calcularIdade('2001-12-31', hoje)).toBe(24)
  })

  it('conta o ano no dia exato do aniversário', () => {
    expect(calcularIdade('2006-07-20', hoje)).toBe(20)
  })

  it('não conta o ano no dia anterior ao aniversário', () => {
    expect(calcularIdade('2006-07-21', hoje)).toBe(19)
  })

  it('aceita objeto Date como entrada', () => {
    expect(calcularIdade(new Date(2001, 0, 1), hoje)).toBe(25)
  })

  it('parseia strings YYYY-MM-DD como data local (sem shift de fuso)', () => {
    // Em fuso negativo, new Date("2006-07-20") viraria 19/07 e quebraria o cálculo
    expect(calcularIdade('2006-07-20', hoje)).toBe(20)
  })

  it('retorna null para data ausente', () => {
    expect(calcularIdade(null, hoje)).toBeNull()
    expect(calcularIdade(undefined, hoje)).toBeNull()
    expect(calcularIdade('', hoje)).toBeNull()
  })

  it('retorna null para data inválida', () => {
    expect(calcularIdade('não é uma data', hoje)).toBeNull()
  })

  it('usa a data atual quando nenhuma referência é passada', () => {
    const anos = 30
    const nascimento = new Date()
    nascimento.setFullYear(nascimento.getFullYear() - anos)
    expect(calcularIdade(nascimento)).toBe(anos)
  })
})

describe('calcularIdadePorDadosExtras', () => {
  const hoje = new Date(2026, 6, 20)

  it('acha a data pela chave legada "data_nascimento"', () => {
    expect(calcularIdadePorDadosExtras({ data_nascimento: '2001-01-01' }, hoje)).toBe(25)
  })

  it('acha a data por chave slugificada que contém "nascimento"', () => {
    const dados = {
      data_de_nascimento_obs_o_encontro__destinado_para_jovens_de_16_a_29_anos: '2006-03-10',
      nome_completo: 'Fulano',
    }
    expect(calcularIdadePorDadosExtras(dados, hoje)).toBe(20)
  })

  it('ignora campos de texto que mencionam nascimento mas não são data', () => {
    const dados = {
      cidade_de_nascimento: 'São Paulo',
      data_de_nascimento: '2001-01-01',
    }
    expect(calcularIdadePorDadosExtras(dados, hoje)).toBe(25)
  })

  it('retorna null quando não há campo de nascimento', () => {
    expect(calcularIdadePorDadosExtras({ nome: 'Fulano', telefone: '119' }, hoje)).toBeNull()
  })

  it('retorna null para dados_extras ausente', () => {
    expect(calcularIdadePorDadosExtras(null, hoje)).toBeNull()
    expect(calcularIdadePorDadosExtras(undefined, hoje)).toBeNull()
  })
})
