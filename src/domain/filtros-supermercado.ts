import {
  DESCONTO_MINIMO_SUPERMERCADO,
  KEYWORDS_ALIMENTOS,
  KEYWORDS_HIGIENE,
  KEYWORDS_LIMPEZA,
  SELECAO_MAXIMA_SUPERMERCADO,
} from '../config/regras-supermercado';
import { normalizarTexto, tituloTemTermo } from '../lib/texto';
import {
  CategoriaRecomendada,
  CategoriaSupermercado,
  OfertaSupermercado,
  OfertaSupermercadoClassificada,
} from '../types/supermercado';

const DICIONARIO: Record<CategoriaRecomendada, readonly string[]> = {
  Limpeza: KEYWORDS_LIMPEZA,
  'Alimentos & Bebidas': KEYWORDS_ALIMENTOS,
  'Higiene Pessoal': KEYWORDS_HIGIENE,
};

export function classificarCategoria(titulo: string): CategoriaSupermercado {
  const tituloNormalizado = normalizarTexto(titulo);
  let melhor: { categoria: CategoriaRecomendada; tamanho: number } | null = null;

  for (const [categoria, palavras] of Object.entries(DICIONARIO) as [
    CategoriaRecomendada,
    readonly string[],
  ][]) {
    for (const palavra of palavras) {
      if (!tituloTemTermo(tituloNormalizado, palavra)) continue;
      const tamanho = normalizarTexto(palavra).length;
      if (!melhor || tamanho > melhor.tamanho) {
        melhor = { categoria, tamanho };
      }
    }
  }

  return melhor?.categoria ?? 'Outros';
}

export function filtrarPromocoesMuitoBoas(
  ofertas: OfertaSupermercado[]
): OfertaSupermercadoClassificada[] {
  const validas: OfertaSupermercadoClassificada[] = [];

  for (const oferta of ofertas) {
    if (oferta.descontoPercentual < DESCONTO_MINIMO_SUPERMERCADO) continue;
    const categoria = classificarCategoria(oferta.titulo);
    if (categoria === 'Outros') continue;
    validas.push({ ...oferta, categoria });
  }

  return validas;
}

export function ordenarPorDesconto(
  ofertas: OfertaSupermercadoClassificada[]
): OfertaSupermercadoClassificada[] {
  return [...ofertas].sort(
    (a, b) => b.descontoPercentual - a.descontoPercentual || a.precoAtual - b.precoAtual
  );
}

export function selecionarRecomendacoes(
  ofertas: OfertaSupermercadoClassificada[]
): OfertaSupermercadoClassificada[] {
  return ordenarPorDesconto(ofertas).slice(0, SELECAO_MAXIMA_SUPERMERCADO);
}
