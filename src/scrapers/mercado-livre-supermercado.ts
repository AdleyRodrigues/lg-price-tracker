import * as cheerio from 'cheerio';
import { baixarHtml } from '../config/http';
import { ML_SUPERMERCADO_PAGINAS } from '../config/regras-supermercado';
import { extrairPreco } from '../lib/preco';
import { absolutoMercadoLivre, chaveOferta } from '../lib/url';
import { OfertaSupermercado } from '../types/supermercado';

function valorAndes(no: cheerio.Cheerio<any>): number {
  const fraction = no.find('.andes-money-amount__fraction').first().text().trim();
  if (!fraction) return Number.NaN;
  const cents = no.find('.andes-money-amount__cents').first().text().trim();
  return extrairPreco(cents ? `${fraction},${cents}` : fraction);
}

function extrairDesconto(texto: string): number {
  const match = texto.replace(/\s+/g, ' ').match(/(\d+)\s*%/);
  return match ? Number(match[1]) : Number.NaN;
}

function parsearCard($card: cheerio.Cheerio<any>): OfertaSupermercado | null {
  const $titulo = $card
    .find('.promotion-item__title, a.poly-component__title, .poly-component__title')
    .first();
  const titulo = $titulo.text().replace(/\s+/g, ' ').trim();
  if (!titulo) return null;

  const href =
    $card
      .find(
        'a.promotion-item__link-container, a.poly-component__title, a.poly-component__link'
      )
      .first()
      .attr('href') ||
    $titulo.attr('href') ||
    $card.find('a[href*="mercadolivre.com.br"]').first().attr('href') ||
    '';
  const url = chaveOferta(absolutoMercadoLivre(href));
  if (!url) return null;

  const descontoTexto = $card
    .find(
      '.poly-price__discount-polylabel, .poly-price__current .polylabel-pill, .promotion-item__discount'
    )
    .first()
    .text();
  const descontoPercentual = extrairDesconto(descontoTexto);
  if (!Number.isFinite(descontoPercentual)) return null;

  const $atual = $card.find('.poly-price__current .andes-money-amount').first();
  let precoAtual = $atual.length ? valorAndes($atual) : Number.NaN;
  if (!Number.isFinite(precoAtual) || precoAtual <= 0) {
    precoAtual = extrairPreco($card.find('.promotion-item__price').first().text());
  }
  if (!Number.isFinite(precoAtual) || precoAtual <= 0) return null;

  const $antigo = $card
    .find('s.andes-money-amount--previous, .andes-money-amount--previous, .promotion-item__oldprice')
    .first();
  let precoOriginal: number | undefined;
  if ($antigo.length) {
    const extraido = $antigo.find('.andes-money-amount__fraction').length
      ? valorAndes($antigo)
      : extrairPreco($antigo.text());
    if (Number.isFinite(extraido) && extraido > precoAtual) {
      precoOriginal = extraido;
    }
  }

  const oferta: OfertaSupermercado = {
    titulo,
    precoAtual,
    descontoPercentual,
    url,
  };
  if (precoOriginal !== undefined) oferta.precoOriginal = precoOriginal;
  return oferta;
}

export function parsearVitrineSupermercado(html: string): OfertaSupermercado[] {
  const $ = cheerio.load(html);
  const ofertas: OfertaSupermercado[] = [];
  const vistos = new Set<string>();

  $('.promotion-item, .poly-card').each((_, el) => {
    const oferta = parsearCard($(el));
    if (!oferta) return;
    const chave = chaveOferta(oferta.url);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    ofertas.push(oferta);
  });

  return ofertas;
}

export async function coletarOfertasSupermercado(): Promise<OfertaSupermercado[]> {
  const paginas = await Promise.all(
    ML_SUPERMERCADO_PAGINAS.map(async (url, indice) => {
      const html = await baixarHtml(url, {
        Referer: 'https://www.mercadolivre.com.br/',
      });

      if (/captcha|challenge-form|security.?check/i.test(html) && html.length < 20_000) {
        throw new Error(
          `Captcha / bloqueio anti-bot do Mercado Livre (página ${indice + 1})`
        );
      }

      const cards = parsearVitrineSupermercado(html);
      console.log(`[mercado-livre-supermercado] página ${indice + 1}: ${cards.length} cards`);
      return cards;
    })
  );

  const vistos = new Set<string>();
  const unicas: OfertaSupermercado[] = [];
  for (const cards of paginas) {
    for (const oferta of cards) {
      const chave = chaveOferta(oferta.url);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      unicas.push(oferta);
    }
  }

  console.log(
    `[mercado-livre-supermercado] ${unicas.length} cards únicos após juntar ${ML_SUPERMERCADO_PAGINAS.length} páginas.`
  );
  return unicas;
}
