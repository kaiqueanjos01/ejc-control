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

/**
 * Extrai a idade a partir do JSONB `dados_extras` de um encontrista.
 * A chave do campo de nascimento é slugificada do label do formulário e varia
 * por encontro (ex.: `data_de_nascimento_obs_...`), mas sempre contém
 * "nascimento". Varre as chaves procurando uma cujo valor seja uma data válida.
 * @param {Object} dadosExtras - objeto dados_extras do encontrista
 * @param {Date} [hoje] - data de referência (default: agora)
 * @returns {number|null} idade em anos, ou null se não houver data de nascimento
 */
export function calcularIdadePorDadosExtras(dadosExtras, hoje = new Date()) {
  if (!dadosExtras || typeof dadosExtras !== 'object') return null

  for (const [chave, valor] of Object.entries(dadosExtras)) {
    if (chave.toLowerCase().includes('nascimento')) {
      const idade = calcularIdade(valor, hoje)
      if (idade != null) return idade
    }
  }
  return null
}
