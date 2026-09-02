export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .toLowerCase();
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match de palavra/frase em título já normalizado (sem acento). */
export function tituloTemTermo(tituloNormalizado: string, termoBruto: string): boolean {
  const termo = normalizarTexto(termoBruto);
  if (!termo) return false;
  if (termo.includes(' ')) return tituloNormalizado.includes(termo);
  const padrao = new RegExp(`(^|[^a-z0-9])${escaparRegex(termo)}([^a-z0-9]|$)`);
  return padrao.test(tituloNormalizado);
}
