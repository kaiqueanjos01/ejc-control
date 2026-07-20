/**
 * Parse a date value into a Date, treating YYYY-MM-DD strings as local dates
 * (avoids the UTC shift of `new Date("YYYY-MM-DD")` in negative timezones).
 */
function parseData(valor) {
  if (valor instanceof Date) return valor
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(valor)
}

/**
 * Calcula a idade em anos a partir de uma data de nascimento.
 * Ajusta por mês/dia: não conta o ano corrente se o aniversário ainda não passou.
 * @param {string|Date} dataNascimento - data de nascimento (string parseável ou Date)
 * @param {Date} [hoje] - data de referência (default: agora), útil para testes
 * @returns {number|null} idade em anos, ou null se ausente/inválida
 */
export function calcularIdade(dataNascimento, hoje = new Date()) {
  if (!dataNascimento) return null

  const nascimento = parseData(dataNascimento)
  if (Number.isNaN(nascimento.getTime())) return null

  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }

  return idade < 0 ? null : idade
}
