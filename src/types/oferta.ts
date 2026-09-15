export interface Oferta {
  loja: string;
  titulo: string;
  precoTotal: number;
  precoAVista: number;
  frete: number;
  url: string;
  cupomTag?: string;
  sku?: string;
  ehCompact?: boolean;
  fonteId?: string;
}

export interface OfertaBruta {
  loja: string;
  titulo: string;
  precoAVista: number;
  frete: number;
  url: string;
  cupomTag?: string;
  fonteId: string;
  sku?: string;
  ehCompact?: boolean;
}

export interface FonteScraper {
  id: string;
  coletar(): Promise<Oferta[]>;
}

export function toOferta(bruta: OfertaBruta): Oferta {
  const oferta: Oferta = {
    loja: bruta.loja,
    titulo: bruta.titulo,
    precoAVista: bruta.precoAVista,
    frete: bruta.frete,
    precoTotal: Math.round((bruta.precoAVista + bruta.frete) * 100) / 100,
    url: bruta.url,
  };
  if (bruta.cupomTag) oferta.cupomTag = bruta.cupomTag;
  if (bruta.sku) oferta.sku = bruta.sku;
  if (bruta.ehCompact) oferta.ehCompact = bruta.ehCompact;
  if (bruta.fonteId) oferta.fonteId = bruta.fonteId;
  return oferta;
}
