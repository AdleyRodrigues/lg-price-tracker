import { detalheErro } from '../config/http';
import { aceitarOferta } from '../domain/filtros';
import { scrapers } from '../scrapers';
import { Oferta } from '../types/oferta';

export async function coletarOfertas(): Promise<Oferta[]> {
  const settled = await Promise.allSettled(scrapers.map((scraper) => scraper.coletar()));

  const ofertas: Oferta[] = [];
  for (const resultado of settled) {
    if (resultado.status === 'fulfilled') {
      ofertas.push(...resultado.value);
    } else {
      console.error(`Fonte falhou por completo: ${detalheErro(resultado.reason)}`);
    }
  }

  const validas = ofertas.filter(aceitarOferta);
  const mapaUnicas = new Map<string, Oferta>();

  for (const o of validas) {
    const chave = o.url.trim().toLowerCase();
    const existente = mapaUnicas.get(chave);
    if (!existente || o.precoTotal < existente.precoTotal) {
      mapaUnicas.set(chave, o);
    }
  }

  return [...mapaUnicas.values()];
}
