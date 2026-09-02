export function chaveOferta(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '') || url;
  } catch {
    return url.split('?')[0]?.split('#')[0] ?? url;
  }
}

export function absolutoMercadoLivre(href: string): string {
  const bruto = href.trim();
  if (!bruto) return '';
  if (bruto.startsWith('http://') || bruto.startsWith('https://')) return bruto;
  if (bruto.startsWith('/')) return `https://www.mercadolivre.com.br${bruto}`;
  return '';
}
