import { TAMANHO_PODIO } from '../config/regras';
import { Oferta } from '../types/oferta';

export function ordenarPorTotal(ofertas: Oferta[]): Oferta[] {
  return [...ofertas].sort((a, b) => a.precoTotal - b.precoTotal);
}

export function podio(ofertas: Oferta[], tamanho = TAMANHO_PODIO): Oferta[] {
  return ofertas.slice(0, tamanho);
}
