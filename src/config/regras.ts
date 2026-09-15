export const CEP = '60440-240';

export const PROMOBIT_BUSCA_URL =
  'https://www.promobit.com.br/buscar?q=lg+dual+inverter+9000+frio';
export const PROMOBIT_SEARCH_API =
  'https://api.promobit.com.br/search?q=lg+dual+inverter+9000+frio';

export const FRETE_FALLBACK_COMUNIDADE = 100;
export const PRECO_MINIMO = 1500;
export const THRESHOLD_ALERTA_CRITICO = 1850;
export const FRETE_FALLBACK_LEVEROS = 86.98;
export const FRETE_FALLBACK_LG = 352.80;
export const FRETE_FALLBACK_WEBCONTINENTAL = 205;
export const TAMANHO_PODIO = Number(process.env.TAMANHO_PODIO) || 5;

export const TITULO_BLOQUEADO =
  /smart\s*inverter|s3-q09ja|ja31|ja33|127\s*v|110\s*v|127\s*volts|110\s*volts|quente|hot|s3-w|condensadora|evaporadora|s4nq|s4uq|12000|12\.000|18000|18\.000|24000|24\.000|placa|suporte|controle\s*remoto/i;

export const VALIDA_DUAL_INVERTER = /dual\s*(inverter|voice)|s3-q09aa/i;

export const EXIGE_9000_BTU = /9\s*000|9\.000|9k|q09/i;

export const OFERTA_ENCERRADA =
  /encerrada|expirada|expired|finished|closed|inativ[ao]|esgotad|indispon[íi]vel/i;


