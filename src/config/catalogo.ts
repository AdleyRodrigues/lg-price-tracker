import { FRETE_FALLBACK_AMAZON } from './regras';

export interface ItemCatalogo {
  loja: string;
  produto: string;
  url: string;
  parser: 'amazon' | 'promobit' | string;
  sku?: string;
  freteFallback?: number;
}

export const CATALOGO: ItemCatalogo[] = [
  {
    loja: 'Amazon (Busca RTX 4060)',
    produto: 'Notebook Gamer RTX 4060',
    url: 'https://www.amazon.com.br/s?k=notebook+rtx+4060',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
  {
    loja: 'Amazon (Busca RTX 5050)',
    produto: 'Notebook Gamer RTX 5050',
    url: 'https://www.amazon.com.br/s?k=notebook+rtx+5050',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_AMAZON,
  },
];
