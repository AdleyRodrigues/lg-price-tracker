import { OFERTA_ENCERRADA, PRECO_MINIMO, TITULO_BLOQUEADO } from '../config/regras';
import { Oferta } from '../types/oferta';

export function tituloBloqueado(titulo: string): boolean {
  return !titulo || TITULO_BLOQUEADO.test(titulo);
}

export function precoAbaixoDoPiso(preco: number): boolean {
  return !Number.isFinite(preco) || preco < PRECO_MINIMO;
}

export function ofertaEncerrada(status: string): boolean {
  return OFERTA_ENCERRADA.test(status);
}

export function ofertaBrutaValida(titulo: string, preco: number, status = ''): boolean {
  if (tituloBloqueado(titulo)) {
    console.log(`[filtro] descartado pelo título: "${titulo}"`);
    return false;
  }
  if (precoAbaixoDoPiso(preco)) return false;
  if (ofertaEncerrada(status)) return false;
  return true;
}

export function aceitarOferta(oferta: Oferta): boolean {
  return ofertaBrutaValida(oferta.titulo, oferta.precoTotal);
}
