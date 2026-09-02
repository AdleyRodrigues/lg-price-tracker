import * as cheerio from 'cheerio';
import { CHROME_HEADERS, detalheErro, http } from '../config/http';
import {
  FRETE_FALLBACK_COMUNIDADE,
  PROMOBIT_BUSCA_URL,
  PROMOBIT_SEARCH_API,
} from '../config/regras';
import { ofertaBrutaValida } from '../domain/filtros';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

interface PromobitOffer {
  offer_title?: string;
  offer_price?: number;
  offer_coupon?: string | null;
  offer_slug?: string;
  offer_status_name?: string;
  offer_cta?: string | null;
}

function montarOfertaComunidade(
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

function varrerCardsPromobit(html: string): Oferta[] {
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
    const url = href.startsWith('http')
      ? href
      : href
        ? `https://www.promobit.com.br${href}`
        : PROMOBIT_BUSCA_URL;

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

function mapearJsonPromobit(item: PromobitOffer): Oferta | null {
  const titulo = item.offer_title?.trim() ?? '';
  const preco = Number(item.offer_price);
  const status = `${item.offer_status_name ?? ''} ${item.offer_cta ?? ''}`;
  if (!ofertaBrutaValida(titulo, preco, status)) return null;

  const slug = item.offer_slug ?? '';
  const url = slug ? `https://www.promobit.com.br/oferta/${slug}` : PROMOBIT_BUSCA_URL;

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
      console.log(`[Comunidade (Promobit)] ${lista.length} oferta(s) válida(s) após filtros.`);
      return lista;
    } catch (err) {
      console.error(`[Comunidade (Promobit)] falha na consulta (${detalheErro(err)}). Fonte ignorada.`);
      return [];
    }
  },
};
