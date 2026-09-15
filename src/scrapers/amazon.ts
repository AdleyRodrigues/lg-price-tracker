import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { baixarHtml, detalheErro } from '../config/http';
import {
  CEP,
  FRETE_FALLBACK_AMAZON,
  FRETE_FALLBACK_LEVEROS,
  FRETE_FALLBACK_WEBCONTINENTAL,
} from '../config/regras';
import { ofertaBrutaValida } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export function primeiroTexto($: cheerio.CheerioAPI, seletores: string[]): string {
  for (const seletor of seletores) {
    const elementos = $(seletor).toArray();
    for (const el of elementos) {
      const texto = $(el).text().trim();
      if (texto && /R\$\s*[\d.]+,\d{2}|\d+[\.,]\d{2}/.test(texto)) {
        return texto;
      }
    }
  }
  return '';
}

export function vendedorAmazon($: cheerio.CheerioAPI): string {
  const raw = [
    $('#sellerProfileTriggerId').first().text(),
    $('#merchant-info').text(),
    $('#tabular-buybox .tabular-buybox-text').text(),
    $('[data-feature-name="merchantInfo"]').text(),
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/friopecas/i.test(raw)) return 'FRIOPECAS';
  if (/leveros/i.test(raw)) return 'Leveros';
  if (/webcontinental/i.test(raw)) return 'Webcontinental';
  if (/amazon/i.test(raw)) return 'Amazon';

  const match = raw.match(/(?:vendido por|enviado e vendido por|enviado por|vendedor)\s*:?\s*([A-Za-z0-9À-ÿ\s\-_]+)/i);
  if (match && match[1]) {
    return match[1].trim().slice(0, 30);
  }

  return raw ? raw.slice(0, 30) : '';
}

export function freteFallbackAmazon(item: ItemCatalogo, vendedor: string): number {
  const chave = `${item.loja} ${vendedor}`.toLowerCase();
  if (chave.includes('webcontinental')) return FRETE_FALLBACK_WEBCONTINENTAL;
  if (chave.includes('leveros')) return FRETE_FALLBACK_LEVEROS;
  if (chave.includes('friopecas')) return FRETE_FALLBACK_LEVEROS;
  return item.freteFallback ?? FRETE_FALLBACK_AMAZON;
}

export function parsearAmazon(html: string, item: ItemCatalogo): OfertaBruta {
  if (/opfcaptcha|amazon-captcha|validateCaptcha|sorry, we just need to make sure you're not a robot/i.test(html)) {
    throw new Error('Captcha / bloqueio anti-bot da Amazon');
  }

  const $ = cheerio.load(html);

  // 1. Remover carrosséis e elementos de recomendação/outras ofertas para evitar falsos positivos
  $(
    '#p13n-desktop-sims-fbt, #dp-sims-container, [id*="sp_detail"], #desktop-dp-sims_feature_div, ' +
    '#sponsoredProducts2_feature_div, #aod-ingress-link, #all-offers-display, #similarities_feature_div, ' +
    '#purchase-sims-feature, #session-sims-feature, #dp-mws-widget, #desktop-bundle-atc_feature_div, ' +
    '#bundle-v2-atc-container, #sims-consolidated-1_feature_div, #sims-consolidated-2_feature_div'
  ).remove();

  // 2. Priorizar seletores do box principal de preço
  let precoBruto = primeiroTexto($, [
    '#corePrice_feature_div .apex-pricetopay-value .a-offscreen',
    '#corePrice_feature_div .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#apex_desktop .apex-pricetopay-value .a-offscreen',
    '#apex_desktop .priceToPay .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    '#centerCol #corePrice_feature_div .a-offscreen',
    '#centerCol .apex-pricetopay-value .a-offscreen',
    '#centerCol .priceToPay .a-offscreen',
    '#centerCol .apexPriceToPay .a-offscreen',
    '#centerCol .a-price .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '.priceToPay .a-offscreen',
    '#corePrice_desktop .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
  ]);

  if (!precoBruto) {
    const whole = $('#corePrice_feature_div .a-price-whole, #apex_desktop .a-price-whole, #centerCol .a-price-whole')
      .first()
      .text()
      .trim();
    const fraction = $('#corePrice_feature_div .a-price-fraction, #apex_desktop .a-price-fraction, #centerCol .a-price-fraction')
      .first()
      .text()
      .trim();
    if (whole) {
      precoBruto = `${whole}${fraction ? `,${fraction}` : ''}`;
    }
  }

  // Fallback escopado estritamente à coluna central/buybox (nunca no documento inteiro)
  if (!precoBruto) {
    $('#centerCol .a-price .a-offscreen, #rightCol .a-price .a-offscreen, #desktop_buybox .a-price .a-offscreen').each((_, el) => {
      const t = $(el).text().trim();
      if (/R\$\s*[\d.]+,\d{2}/.test(t) && !precoBruto) {
        precoBruto = t;
      }
    });
  }

  if (!precoBruto) {
    throw new Error('seletor de preço não encontrado no HTML');
  }

  let precoAVista = extrairPreco(precoBruto);
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    throw new Error(`preço inválido extraído: "${precoBruto}"`);
  }

  // Verificar se o preço extraído foi o valor parcelado total e há desconto Pix no buybox
  const textoPrecoCentral = $('#centerCol, #apex_desktop, #corePrice_feature_div').text().replace(/\s+/g, ' ');
  const matchPix = textoPrecoCentral.match(/(\d+)%\s*off\s*à\s*vista/i);
  const matchTotalParcelado = textoPrecoCentral.match(/total\s*parcelado\s*R\$\s*([\d.]+,\d{2})/i);
  if (matchPix && matchTotalParcelado) {
    const totalParcelado = extrairPreco(matchTotalParcelado[1]);
    const pctDesc = parseInt(matchPix[1], 10);
    if (Math.abs(precoAVista - totalParcelado) < 1) {
      precoAVista = Math.round(totalParcelado * (1 - pctDesc / 100) * 100) / 100;
      console.log(`[Amazon] desconto Pix de ${pctDesc}% aplicado sobre parcelado ${formatBRL(totalParcelado)} => ${formatBRL(precoAVista)}`);
    }
  }

  console.log(`[${item.loja}] preço bruto extraído: "${precoBruto}" => ${formatBRL(precoAVista)}`);

  const vendedor = vendedorAmazon($);
  const fallbackFrete = freteFallbackAmazon(item, vendedor);
  const blocoFrete = [
    $('#deliveryBlockMessage').text(),
    $('#mir-layout-DELIVERY_BLOCK').text(),
    $('#ourprice_shippingmessage').text(),
    $('#FREE_DELIVERY_BUYBOX_FEATURE_DIV').text(),
    $('#delivery-message').text(),
  ]
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .find((t) => t.length > 0);

  let frete = fallbackFrete;
  let freteBruto = '';

  if (blocoFrete) {
    freteBruto = blocoFrete;
    const matchValor = blocoFrete.match(/(?:entrega|frete)?\s*R\$\s*[\d.]+,\d{2}/i)?.[0];
    if (matchValor && /R\$\s*[\d.]+,\d{2}/.test(matchValor)) {
      frete = extrairPreco(matchValor);
    } else if (/entrega\s*gr[áa]tis|frete\s*gr[áa]tis/i.test(blocoFrete)) {
      const sellerTerceiro = /leveros|webcontinental|friopecas/i.test(`${item.loja} ${vendedor}`);
      if (sellerTerceiro) {
        frete = fallbackFrete;
        console.warn(
          `[${item.loja}] HTML diz entrega grátis, mas o seller é 3P. Frete Fortaleza: ${formatBRL(fallbackFrete)}.`
        );
      } else {
        frete = 0;
      }
    } else {
      console.warn(
        `[${item.loja}] bloco de entrega sem valor explícito. Fallback Fortaleza: ${formatBRL(fallbackFrete)}.`
      );
    }
  } else {
    console.warn(
      `[${item.loja}] frete regional não veio no HTML. Fallback Fortaleza: ${formatBRL(fallbackFrete)}.`
    );
  }

  console.log(
    `[${item.loja}] frete bruto extraído: "${freteBruto || '(não encontrado)'}" => ${formatBRL(frete)}`
  );

  let nomeLoja = item.loja;
  if (vendedor && !item.loja.toLowerCase().includes(vendedor.toLowerCase())) {
    nomeLoja = `Amazon (${vendedor})`;
  }

  return {
    loja: nomeLoja,
    titulo: item.produto,
    precoAVista,
    frete,
    url: item.url,
    fonteId: 'amazon',
    sku: item.sku,
  };
}

export function parsearBuscaAmazon(html: string, item: ItemCatalogo): Oferta[] {
  if (/opfcaptcha|amazon-captcha|validateCaptcha|sorry, we just need to make sure you're not a robot/i.test(html)) {
    throw new Error('Captcha / bloqueio anti-bot da Amazon');
  }

  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const cards = $('[data-component-type="s-search-result"]').toArray();

  for (const el of cards) {
    const card = $(el);
    const asin = card.attr('data-asin')?.trim();
    const titulo = card.find('h2 a span, h2 span, h2').first().text().replace(/\s+/g, ' ').trim();
    if (!titulo) continue;

    let precoBruto = card.find('.a-price .a-offscreen').first().text().trim();
    if (!precoBruto) {
      const whole = card.find('.a-price-whole').first().text().trim();
      const fraction = card.find('.a-price-fraction').first().text().trim();
      if (whole) {
        precoBruto = `${whole}${fraction ? `,${fraction}` : ''}`;
      }
    }
    if (!precoBruto) continue;

    const precoAVista = extrairPreco(precoBruto);
    if (!Number.isFinite(precoAVista) || precoAVista <= 0) continue;

    if (!ofertaBrutaValida(titulo, precoAVista)) continue;

    const hrefRel = card.find('h2 a, a.a-link-normal[href*="/dp/"]').first().attr('href') ?? '';
    let url = hrefRel.startsWith('http')
      ? hrefRel
      : (hrefRel ? `https://www.amazon.com.br${hrefRel}` : (asin ? `https://www.amazon.com.br/dp/${asin}` : item.url));

    if (asin) {
      url = `https://www.amazon.com.br/dp/${asin}`;
    }

    const textoEntrega = card.find('[aria-label*="entrega"], [aria-label*="frete"], [class*="delivery"]').text().trim();
    let frete = item.freteFallback ?? FRETE_FALLBACK_AMAZON;
    if (/gr[áa]tis|prime/i.test(textoEntrega)) {
      frete = 0;
    } else {
      const matchFrete = textoEntrega.match(/R\$\s*[\d.]+,\d{2}/);
      if (matchFrete) frete = extrairPreco(matchFrete[0]);
    }

    console.log(`[Amazon (Busca)] ${titulo.slice(0, 60)} => ${formatBRL(precoAVista)} (frete: ${formatBRL(frete)})`);

    const bruta: OfertaBruta = {
      loja: 'Amazon',
      titulo,
      precoAVista,
      frete,
      url,
      fonteId: 'amazon',
      sku: asin,
    };

    ofertas.push(toOferta(bruta));
  }

  return ofertas;
}

let cachedAmazonCookies: string | null = null;
let lastCookieTime = 0;

export async function obterCookiesAmazonCep(cep = '60440240', forceFresh = false): Promise<string> {
  const agora = Date.now();
  if (!forceFresh && cachedAmazonCookies && agora - lastCookieTime < 15 * 60 * 1000) {
    return cachedAmazonCookies;
  }

  const cookieMap = new Map<string, string>();
  cookieMap.set('i18n-prefs', 'BRL');
  cookieMap.set('lc-acbbr', 'pt_BR');

  try {
    const { http } = await import('../config/http');
    const r1 = await http.get('https://www.amazon.com.br/', {
      headers: {
        'Cookie': 'i18n-prefs=BRL; lc-acbbr=pt_BR;',
      },
      timeout: 10000,
      signal: AbortSignal.timeout(10000),
    });

    const rawCookies1 = (r1.headers['set-cookie'] as string[] | undefined) || [];
    rawCookies1.forEach((c) => {
      const parts = c.split(';')[0].split('=');
      if (parts[0] && parts[1]) cookieMap.set(parts[0].trim(), parts.slice(1).join('=').trim());
    });

    const getCookieHeader = () => Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    const $1 = cheerio.load(r1.data);
    const antiCsrf = ($1('input[name="anti-csrftoken-a2z"]').val() as string) || '';

    const glowRes = await http.post(
      'https://www.amazon.com.br/portal-migration/hz/glow/address-change?actionSource=glow',
      {
        locationType: 'LOCATION_INPUT',
        zipCode: cep,
        deviceType: 'web',
        pageType: 'Search',
        actionSource: 'glow',
      },
      {
        headers: {
          'Cookie': getCookieHeader(),
          'anti-csrftoken-a2z': antiCsrf,
          'x-requested-with': 'XMLHttpRequest',
          'content-type': 'application/json',
          'Referer': 'https://www.amazon.com.br/',
        },
        timeout: 10000,
        signal: AbortSignal.timeout(10000),
      }
    );

    const rawCookies2 = (glowRes.headers['set-cookie'] as string[] | undefined) || [];
    rawCookies2.forEach((c) => {
      const parts = c.split(';')[0].split('=');
      if (parts[0] && parts[1]) cookieMap.set(parts[0].trim(), parts.slice(1).join('=').trim());
    });

    cachedAmazonCookies = getCookieHeader();
    lastCookieTime = agora;
    return cachedAmazonCookies;
  } catch (err) {
    return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function rasparItem(item: ItemCatalogo): Promise<Oferta[]> {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const cookie = await obterCookiesAmazonCep(CEP, tentativa > 1);
      const html = await baixarHtml(item.url, {
        Referer: 'https://www.amazon.com.br/',
        Cookie: cookie,
      });

      if (item.url.includes('/s?') || item.url.includes('/s/')) {
        return parsearBuscaAmazon(html, item);
      }

      return [toOferta(parsearAmazon(html, item))];
    } catch (err) {
      if (tentativa === 1) {
        console.warn(`[${item.loja}] tentativa 1 falhou: ${detalheErro(err)}. Tentando novamente com nova sessão...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[${item.loja}] falha no scraping após ${tentativa} tentativas: ${detalheErro(err)}. Loja ignorada.`);
      return [];
    }
  }
  return [];
}

export const amazonScraper: FonteScraper = {
  id: 'amazon',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'amazon');
    const settled = await Promise.allSettled(itens.map((item) => rasparItem(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
