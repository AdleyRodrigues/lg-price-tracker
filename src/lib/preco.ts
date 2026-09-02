export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Limpa R$, espaços e milhar; troca vírgula por ponto decimal. */
export function extrairPreco(texto: string): number {
  const normalizado = texto
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}
