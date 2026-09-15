import * as cheerio from 'cheerio';
import { baixarHtml, CHROME_HEADERS, detalheErro, http } from '../config/http';
import {
  FRETE_FALLBACK_COMUNIDADE,
  PROMOBIT_BUSCA_URL,
  PROMOBIT_SEARCH_API,
} from '../config/regras';
import { ofertaBrutaValida, ofertaEncerrada } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

export interface PromobitOffer {
  offer_title?: string;
  offer_price?: number;
  offer_coupon?: string | null;
  offer_slug?: string;
  offer_status_name?: string;
  offer_cta?: string | null;
}

export function montarOfertaComunidade(
  titulo: string,
  precoPostagem: number,
  url: string,
  cupomMencionado: boolean,
  cupomCodigo?: string | null
): Oferta {
  const bruta: OfertaBruta = {
    loja: 'Comunidade (Promobit)',
    titulo,
    precoAVista: precoPostagem,
    frete: FRETE_FALLBACK_COMUNIDADE,
    url,
    fonteId: 'promobit',
  };
  if (cupomMencionado || cupomCodigo) {
    bruta.cupomTag = cupomCodigo?.trim() || 'Cupom';
  }
  return toOferta(bruta);
}

export function varrerCardsPromobit(html: string): Oferta[] {
  const $ = cheerio.load(html);
  const ofertas: Oferta[] = [];
  const cards = $('article, [class*="offer"], [data-testid*="offer"], li').toArray();

  for (const el of cards) {
    const card = $(el);
    const texto = card.text().replace(/\s+/g, ' ').trim();
    if (texto.length < 20 || texto.length > 800) continue;
    if (!/lg|dual|inverter|9000|9\.000/i.test(texto)) continue;

    const titulo =
      card.find('h1, h2, h3, a').first().text().replace(/\s+/g, ' ').trim() ||
      texto.slice(0, 140);
    const precoBruto = texto.match(/R\$\s*[\d.]+,\d{2}/)?.[0];
    if (!precoBruto) continue;

    const preco = extrairPreco(precoBruto);
    const href = card.find('a[href]').first().attr('href') ?? '';
    if (!href || !href.includes('/oferta/')) continue;

    const url = href.startsWith('http') ? href : `https://www.promobit.com.br${href}`;

    if (!ofertaBrutaValida(titulo, preco, texto)) continue;

    console.log(`[Comunidade (Promobit)] card HTML preço bruto: "${precoBruto}" => ${formatBRL(preco)}`);
    ofertas.push(
      montarOfertaComunidade(
        titulo,
        preco,
        url,
        /cupom/i.test(texto),
        texto.match(/cupom[:\s]+([A-Z0-9_-]{3,})/i)?.[1]
      )
    );
  }

  return ofertas;
}

export function mapearJsonPromobit(item: PromobitOffer): Oferta | null {
  const titulo = item.offer_title?.trim() ?? '';
  const preco = Number(item.offer_price);
  const status = `${item.offer_status_name ?? ''} ${item.offer_cta ?? ''}`;
  if (!ofertaBrutaValida(titulo, preco, status)) return null;

  const slug = item.offer_slug?.trim() ?? '';
  if (!slug) return null;

  const url = `https://www.promobit.com.br/oferta/${slug}`;

  console.log(
    `[Comunidade (Promobit)] JSON preço bruto: "${item.offer_price}" (${titulo.slice(0, 70)}) => ${formatBRL(preco)} + frete ${formatBRL(FRETE_FALLBACK_COMUNIDADE)}`
  );

  return montarOfertaComunidade(
    titulo,
    preco,
    url,
    Boolean(item.offer_coupon) || /cupom/i.test(titulo),
    item.offer_coupon
  );
}

export function verificarHtmlPromobitEncerrado(html: string): boolean {
  const $ = cheerio.load(html);

  // 1. Inspeciona __NEXT_DATA__ (estado oficial do SSR/Hydration)
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const parsed = JSON.parse(nextDataScript);
      const serverOffer = parsed.props?.pageProps?.serverOffer;
      if (serverOffer) {
        const statusName = String(serverOffer.offerStatusName || '').toUpperCase();
        if (['FINISHED', 'EXPIRED', 'INACTIVE', 'CLOSED', 'ENDED', 'ENCERRADA'].includes(statusName)) {
          return true;
        }
        if (serverOffer.offerStatus === 5 || serverOffer.offerStatus === 0) {
          return true;
        }
        if (serverOffer.isExpired || serverOffer.isClosed || serverOffer.isOfferExpired) {
          return true;
        }
        if (serverOffer.offerCta === null && !serverOffer.aliasUrl && !serverOffer.storeDomain) {
          return true;
        }
      }
    } catch {
      // JSON parse fallback
    }
  }

  // 2. Inspeciona botões e badges explícitos de oferta encerrada
  const textosUI = $('button, a, span, div')
    .map((_, el) => $(el).text().trim())
    .get();

  for (const t of textosUI) {
    if (/^oferta\s*encerrada$/i.test(t) || /^encerrada$/i.test(t) || /^expirad[ao]$/i.test(t)) {
      return true;
    }
  }

  // 3. Checa ausência de CTA "Ir para a loja" e presença de "Ativar Alerta"
  const temIrParaLoja = $('button, a').filter((_, el) => {
    const t = $(el).text().trim();
    return /ir\s*para\s*a\s*loja|pegar\s*promo[çc][ãa]o|ver\s*oferta/i.test(t);
  }).length > 0;

  const temAtivarAlerta = $('button, a').filter((_, el) => {
    const t = $(el).text().trim();
    return /ativar\s*alerta/i.test(t);
  }).length > 0;

  if (!temIrParaLoja && temAtivarAlerta) {
    return true;
  }

  return false;
}

export async function paginaPromobitEncerrada(url: string): Promise<boolean> {
  if (!/^https:\/\/www\.promobit\.com\.br\/oferta\//i.test(url)) return true;
  try {
    const html = await baixarHtml(url, { Referer: 'https://www.promobit.com.br/' });
    const encerrada = verificarHtmlPromobitEncerrado(html);
    if (encerrada) {
      console.log(`[Comunidade (Promobit)] descartada na PDP (encerrada): ${url}`);
    }
    return encerrada;
  } catch (err) {
    console.warn(
      `[Comunidade (Promobit)] não deu para validar a PDP (${detalheErro(err)}). Descartando ${url}`
    );
    return true;
  }
}

export const promobitScraper: FonteScraper = {
  id: 'promobit',
  async coletar(): Promise<Oferta[]> {
    try {
      const [htmlRes, jsonRes] = await Promise.allSettled([
        http.get<string>(PROMOBIT_BUSCA_URL, {
          headers: { ...CHROME_HEADERS, Referer: 'https://www.promobit.com.br/' },
        }),
        http.get<{ active_offers?: PromobitOffer[] }>(PROMOBIT_SEARCH_API, {
          headers: {
            Accept: 'application/json',
            Origin: 'https://www.promobit.com.br',
            Referer: PROMOBIT_BUSCA_URL,
          },
        }),
      ]);

      const doHtml: Oferta[] = [];
      if (htmlRes.status === 'fulfilled' && htmlRes.value.status < 400) {
        const html = typeof htmlRes.value.data === 'string' ? htmlRes.value.data : '';
        doHtml.push(...varrerCardsPromobit(html));
      } else if (htmlRes.status === 'rejected') {
        console.warn(`[Comunidade] HTML Promobit falhou: ${detalheErro(htmlRes.reason)}`);
      }

      const doJson: Oferta[] = [];
      if (jsonRes.status === 'fulfilled' && jsonRes.value.status < 400) {
        for (const item of jsonRes.value.data.active_offers ?? []) {
          const oferta = mapearJsonPromobit(item);
          if (oferta) doJson.push(oferta);
        }
      } else if (jsonRes.status === 'rejected') {
        console.warn(`[Comunidade] JSON Promobit falhou: ${detalheErro(jsonRes.reason)}`);
      }

      const unicas = new Map<string, Oferta>();
      for (const oferta of [...doHtml, ...doJson]) {
        const chave = `${oferta.titulo}|${oferta.precoTotal}`;
        if (!unicas.has(chave)) unicas.set(chave, oferta);
      }

      const lista = [...unicas.values()];
      const checadas = await Promise.all(
        lista.map(async (oferta) =>
          (await paginaPromobitEncerrada(oferta.url)) ? null : oferta
        )
      );
      const ativas = checadas.filter((oferta): oferta is Oferta => oferta !== null);
      console.log(
        `[Comunidade (Promobit)] ${ativas.length} oferta(s) ativa(s) de ${lista.length} candidata(s).`
      );
      return ativas;
    } catch (err) {
      console.error(`[Comunidade (Promobit)] falha na consulta (${detalheErro(err)}). Fonte ignorada.`);
      return [];
    }
  },
};
