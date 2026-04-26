export function buildWhatsAppUrl({ numero, template, nome, telefone }) {
  const numeroLimpo = numero.replace(/[\s\-\(\)]/g, '')
  const mensagem = template
    .replace('{nome}', nome)
    .replace('{telefone}', telefone)
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
}
