import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { baixarHtml, detalheErro } from '../config/http';
import {
  FRETE_FALLBACK_LEVEROS,
  FRETE_FALLBACK_WEBCONTINENTAL,
} from '../config/regras';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

function primeiroTexto($: cheerio.CheerioAPI, seletores: string[]): string {
  for (const seletor of seletores) {
    const texto = $(seletor)
      .map((_, el) => $(el).text().trim())
      .get()
      .find((t) => t.length > 0);
    if (texto) return texto;
  }
  return '';
}

function vendedorAmazon($: cheerio.CheerioAPI): string {
  return [$('#sellerProfileTriggerId').text(), $('#merchant-info').text()]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function freteFallbackAmazon(item: ItemCatalogo, vendedor: string): number {
  const chave = `${item.loja} ${vendedor}`.toLowerCase();
  if (chave.includes('webcontinental')) return FRETE_FALLBACK_WEBCONTINENTAL;
  if (chave.includes('leveros')) return FRETE_FALLBACK_LEVEROS;
  return item.freteFallback ?? FRETE_FALLBACK_LEVEROS;
}

function parsearAmazon(html: string, item: ItemCatalogo): OfertaBruta {
  if (/opfcaptcha|amazon-captcha|validateCaptcha|sorry, we just need to make sure you're not a robot/i.test(html)) {
    throw new Error('Captcha / bloqueio anti-bot da Amazon');
  }

  const $ = cheerio.load(html);
  const precoBruto = primeiroTexto($, [
    '.apexPriceToPay .a-offscreen',
    '.priceToPay .a-offscreen',
    '#corePrice_feature_div .a-offscreen',
  ]);

  if (!precoBruto) {
    throw new Error('seletor de preço não encontrado no HTML');
  }

  const precoAVista = extrairPreco(precoBruto);
  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    throw new Error(`preço inválido extraído: "${precoBruto}"`);
  }

  console.log(`[${item.loja}] preço bruto extraído: "${precoBruto}" => ${formatBRL(precoAVista)}`);

  const vendedor = vendedorAmazon($);
  const fallbackFrete = freteFallbackAmazon(item, vendedor);
  const blocoFrete = [
    $('#deliveryBlockMessage').text(),
    $('#mir-layout-DELIVERY_BLOCK').text(),
  ]
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .find((t) => t.length > 0);

  let frete = fallbackFrete;
  let freteBruto = '';

  if (blocoFrete) {
    freteBruto = blocoFrete;
    const valorEntrega = blocoFrete.match(/entrega\s*R\$\s*[\d.]+,\d{2}/i)?.[0];
    if (valorEntrega) {
      frete = extrairPreco(valorEntrega);
    } else if (/entrega\s*gr[áa]tis|frete\s*gr[áa]tis/i.test(blocoFrete)) {
      frete = 0;
    } else {
      console.warn(
        `[${item.loja}] bloco de entrega sem valor. Fallback Fortaleza: ${formatBRL(fallbackFrete)}.`
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

  return {
    loja: item.loja,
    titulo: item.produto,
    precoAVista,
    frete,
    url: item.url,
    fonteId: 'amazon',
  };
}

async function rasparItem(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const html = await baixarHtml(item.url, { Referer: 'https://www.amazon.com.br/' });
    return [toOferta(parsearAmazon(html, item))];
  } catch (err) {
    console.error(`[${item.loja}] falha no scraping: ${detalheErro(err)}. Loja ignorada.`);
    return [];
  }
}

export const amazonScraper: FonteScraper = {
  id: 'amazon',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'amazon');
    const settled = await Promise.allSettled(itens.map((item) => rasparItem(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
