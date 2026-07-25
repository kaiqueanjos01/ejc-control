/** Nome da coluna de check-in para o dia (1 ou 2). */
export function colunaDoDia(dia) {
  return dia === 2 ? 'checkin_dia2_at' : 'checkin_dia1_at'
}

/** True se o encontrista fez check-in em qualquer um dos dois dias. */
export function estaPresente(encontrista) {
  return !!(encontrista?.checkin_dia1_at || encontrista?.checkin_dia2_at)
}

/** True se o encontrista fez check-in no dia informado. */
export function fezCheckinNoDia(encontrista, dia) {
  return !!encontrista?.[colunaDoDia(dia)]
}
