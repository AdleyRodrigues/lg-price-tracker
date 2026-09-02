import { FRETE_FALLBACK_LEVEROS } from './regras';

export interface ItemCatalogo {
  loja: string;
  produto: string;
  url: string;
  parser: 'amazon' | 'lg';
  sku?: string;
  freteFallback?: number;
}

export const CATALOGO: ItemCatalogo[] = [
  {
    loja: 'Amazon (Leveros)',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
    sku: 'S3-Q09AA31F',
    url: 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_LEVEROS,
  },
  {
    loja: 'Loja Oficial LG',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
    sku: 'S3-Q09AA33F',
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
    parser: 'lg',
  },
  {
    loja: 'Loja Oficial LG (S3-Q09AA31A)',
    produto: 'LG Dual Inverter Voice 9000 S3-Q09AA31A',
    sku: 'S3-Q09AA31A',
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa31a-1/?region_id=NST',
    parser: 'lg',
  },
];
