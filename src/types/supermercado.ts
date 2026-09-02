export type CategoriaSupermercado =
  | 'Limpeza'
  | 'Alimentos & Bebidas'
  | 'Higiene Pessoal'
  | 'Outros';

export type CategoriaRecomendada = Exclude<CategoriaSupermercado, 'Outros'>;

export interface OfertaSupermercado {
  titulo: string;
  precoAtual: number;
  precoOriginal?: number;
  descontoPercentual: number;
  url: string;
  categoria?: CategoriaRecomendada;
}

export interface OfertaSupermercadoClassificada extends OfertaSupermercado {
  categoria: CategoriaRecomendada;
}
