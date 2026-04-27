export const MASKED_TYPES = ['phone', 'cpf', 'cnpj', 'cep', 'rg', 'currency']

/**
 * Remove all non-digit characters from a value.
 * Returns '' for falsy input.
 */
export function stripMask(value) {
  if (!value && value !== 0) return ''
  return String(value).replace(/\D/g, '')
}

/**
 * Apply a BR input mask to a value.
 * Accepts raw digits or already-masked strings (idempotent).
 * Returns the formatted string for display.
 */
export function applyMask(value, type) {
  const digits = String(value || '').replace(/\D/g, '')

  switch (type) {
    case 'phone': {
      const d = digits.slice(0, 11)
      if (d.length === 0) return ''
      if (d.length <= 2) return `(${d}`
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    }
    case 'cpf': {
      const d = digits.slice(0, 11)
      if (d.length <= 3) return d
      if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
      if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    }
    case 'cnpj': {
      const d = digits.slice(0, 14)
      if (d.length <= 2) return d
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
      if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    }
    case 'cep': {
      const d = digits.slice(0, 8)
      if (d.length <= 5) return d
      return `${d.slice(0, 5)}-${d.slice(5)}`
    }
    case 'rg': {
      const d = digits.slice(0, 9)
      if (d.length <= 2) return d
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`
    }
    case 'currency': {
      if (!digits) return ''
      const num = parseInt(digits, 10) || 0
      const reais = Math.floor(num / 100)
      const centavos = String(num % 100).padStart(2, '0')
      const reaisStr = reais.toLocaleString('pt-BR')
      return `R$ ${reaisStr},${centavos}`
    }
    default:
      return String(value || '')
  }
}
