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

  return ofertas.filter(aceitarOferta);
}
