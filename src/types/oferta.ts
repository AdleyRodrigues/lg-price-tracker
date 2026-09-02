export interface Oferta {
  loja: string;
  titulo: string;
  precoTotal: number;
  url: string;
  cupomTag?: string;
}

export interface OfertaBruta {
  loja: string;
  titulo: string;
  precoAVista: number;
  frete: number;
  url: string;
  cupomTag?: string;
  fonteId: string;
}

export interface FonteScraper {
  id: string;
  coletar(): Promise<Oferta[]>;
}

export function toOferta(bruta: OfertaBruta): Oferta {
  const oferta: Oferta = {
    loja: bruta.loja,
    titulo: bruta.titulo,
    precoTotal: bruta.precoAVista + bruta.frete,
    url: bruta.url,
  };
  if (bruta.cupomTag) oferta.cupomTag = bruta.cupomTag;
  return oferta;
}
