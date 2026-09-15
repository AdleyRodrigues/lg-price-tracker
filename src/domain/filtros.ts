import {
  OFERTA_ENCERRADA,
  PRECO_MINIMO,
  TITULO_BLOQUEADO,
  VALIDA_GPU,
  VALIDA_NOTEBOOK,
} from '../config/regras';
import { Oferta } from '../types/oferta';

export function tituloBloqueado(titulo: string, sku?: string): boolean {
  if (!titulo) return true;
  const textoCompleto = `${titulo} ${sku ?? ''}`;

  // 1. Bloqueios explícitos (desktop, pc gamer, placa de video, gpu, mesa, suporte, cooler, gabinete, fonte, monitor, teclado, usado)
  if (TITULO_BLOQUEADO.test(textoCompleto)) return true;

  // 2. Exige obrigatoriamente que seja notebook ou laptop
  if (!VALIDA_NOTEBOOK.test(textoCompleto)) return true;

  // 3. Exige obrigatoriamente que contenha GPU 4060 ou 5050
  if (!VALIDA_GPU.test(textoCompleto)) return true;

  return false;
}

export function precoAbaixoDoPiso(preco: number): boolean {
  return !Number.isFinite(preco) || preco < PRECO_MINIMO;
}

export function ofertaEncerrada(status: string): boolean {
  return OFERTA_ENCERRADA.test(status);
}

export function ofertaBrutaValida(titulo: string, preco: number, status = '', sku?: string): boolean {
  if (tituloBloqueado(titulo, sku)) {
    console.log(`[filtro] descartado pela validação de modelo/hardware: "${titulo}" (${sku ?? 'sem sku'})`);
    return false;
  }
  if (precoAbaixoDoPiso(preco)) return false;
  if (ofertaEncerrada(status)) return false;
  return true;
}

export function aceitarOferta(oferta: Oferta): boolean {
  if (!oferta) return false;
  if (!Number.isFinite(oferta.precoTotal) || oferta.precoTotal < PRECO_MINIMO) return false;
  if (!Number.isFinite(oferta.precoAVista) || oferta.precoAVista <= 0) return false;
  if (!Number.isFinite(oferta.frete) || oferta.frete < 0) return false;
  return ofertaBrutaValida(oferta.titulo, oferta.precoTotal, '', oferta.sku);
}
