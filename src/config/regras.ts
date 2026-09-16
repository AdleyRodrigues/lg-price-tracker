export const CEP = process.env.CEP_DESTINO || '01001-000';

export const TERMOS_BUSCA = ['notebook rtx 4060', 'notebook rtx 5050'];

export const PROMOBIT_BUSCA_URLS = [
  'https://www.promobit.com.br/buscar?q=notebook+rtx+4060',
  'https://www.promobit.com.br/buscar?q=notebook+rtx+5050',
];
export const PROMOBIT_SEARCH_APIS = [
  'https://api.promobit.com.br/search?q=notebook+rtx+4060',
  'https://api.promobit.com.br/search?q=notebook+rtx+5050',
];

export const PROMOBIT_BUSCA_URL = PROMOBIT_BUSCA_URLS[0];
export const PROMOBIT_SEARCH_API = PROMOBIT_SEARCH_APIS[0];

export const AMAZON_BUSCA_URLS = [
  'https://www.amazon.com.br/s?k=notebook+rtx+4060',
  'https://www.amazon.com.br/s?k=notebook+rtx+5050',
];

export const FRETE_FALLBACK_COMUNIDADE = 100;
export const PRECO_MINIMO = 3800;
export const THRESHOLD_ALERTA_CRITICO = 5000;
export const FRETE_FALLBACK_LEVEROS = 86.98;
export const FRETE_FALLBACK_LG = 352.80;
export const FRETE_FALLBACK_WEBCONTINENTAL = 205;
export const FRETE_FALLBACK_AMAZON = 0;
export const TAMANHO_PODIO = Number(process.env.TAMANHO_PODIO) || 5;

export const TITULO_BLOQUEADO =
  /desktop|pc\s*gamer|placa\s*de\s*v[íi]deo|gpu|mesa|suporte|cooler|gabinete|fonte|monitor|teclado|usado/i;

export const VALIDA_NOTEBOOK = /notebook|laptop/i;
export const VALIDA_GPU = /4060|5050/i;

export const OFERTA_ENCERRADA =
  /encerrada|expirada|expired|finished|closed|inativ[ao]|esgotad|indispon[íi]vel/i;
