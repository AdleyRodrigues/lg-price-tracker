/** Vitrine de supermercado (MLB1403) + ofertas de limpeza e higiene, que quase não aparecem em MLB1403. */
export const ML_SUPERMERCADO_PAGINAS = [
  ...[1, 2, 3].map(
    (page) => `https://www.mercadolivre.com.br/ofertas?category=MLB1403&page=${page}`
  ),
  ...[1, 2].map(
    (page) => `https://www.mercadolivre.com.br/ofertas?category=MLB186654&page=${page}`
  ),
  'https://www.mercadolivre.com.br/ofertas?category=MLB194050&page=1',
  ...[1, 2].map(
    (page) => `https://www.mercadolivre.com.br/ofertas?category=MLB198312&page=${page}`
  ),
  'https://www.mercadolivre.com.br/ofertas?category=MLB1263&page=1',
];

export const DESCONTO_MINIMO_SUPERMERCADO = 35;
export const SELECAO_MINIMA_SUPERMERCADO = 10;
export const SELECAO_MAXIMA_SUPERMERCADO = 15;

export const KEYWORDS_LIMPEZA = [
  'sabao',
  'omo',
  'ariel',
  'comfort',
  'amaciante',
  'detergente',
  'ype',
  'downy',
  'desinfetante',
  'veja',
  'cloro',
  'agua sanitaria',
  'multiuso',
  'lava roupas',
  'vanish',
  'lysoform',
] as const;

export const KEYWORDS_ALIMENTOS = [
  'maionese',
  'ketchup',
  'heinz',
  'hellmanns',
  'azeite',
  'cafe',
  'arroz',
  'feijao',
  'macarrao',
  'molho',
  'mostarda',
  'chocolate',
  'leite',
  'aveia',
  'atum',
  'nescafe',
  'pilao',
  'melitta',
  'esporao',
  'andorinha',
] as const;

export const KEYWORDS_HIGIENE = [
  'papel higienico',
  'shampoo',
  'condicionador',
  'sabonete',
  'pasta de dente',
  'creme dental',
  'desodorante',
  'rexona',
  'colgate',
  'dove',
  'oral-b',
  'neutrox',
  'protetor solar',
  'neve',
  'palmolive',
  'nivea',
  'listerine',
  'gillette',
] as const;
