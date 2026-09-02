import * as cheerio from 'cheerio';
import { CATALOGO, ItemCatalogo } from '../config/catalogo';
import { baixarHtml, CHROME_HEADERS, detalheErro, http } from '../config/http';
import { extrairPreco, formatBRL } from '../lib/preco';
import { FonteScraper, Oferta, OfertaBruta, toOferta } from '../types/oferta';

interface LgGraphqlProduto {
  name?: string;
  sku?: string;
  cheaper_price?: { amount?: { value?: number } };
  price_range?: { minimum_price?: { final_price?: { value?: number } } };
}

function extrairSkuLg(html: string): string | null {
  return (
    html.match(/const sku = "([^"]+)"/)?.[1] ??
    html.match(/"sku":\s*`([^`]+)`/)?.[1] ??
    html.match(/"sku"\s*:\s*"([^"]+)"/)?.[1] ??
    null
  );
}

async function consultarGraphqlLg(sku: string): Promise<LgGraphqlProduto | null> {
  const query = `
    query getProductsBySku($skuList: [String]) {
      products(filter: { sku: { in: $skuList } }) {
        items {
          name
          sku
          cheaper_price { amount { value currency } cheaper_percent }
          stock_status
          price_range {
            minimum_price {
              final_price { currency value }
              regular_price { currency value }
            }
          }
        }
      }
    }
  `;

  const { data, status } = await http.post<{
    data?: { products?: { items?: LgGraphqlProduto[] } };
    errors?: { message: string }[];
  }>(
    'https://www.lg.com/api/graphql',
    { query, variables: { skuList: [sku] }, operationName: 'getProductsBySku' },
    {
      headers: {
        ...CHROME_HEADERS,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Store: 'br',
        Origin: 'https://www.lg.com',
        Referer: 'https://www.lg.com/br/',
      },
    }
  );

  if (status >= 400) throw new Error(`GraphQL HTTP ${status}`);
  if (data.errors?.length) throw new Error(data.errors.map((e) => e.message).join('; '));
  return data.data?.products?.items?.[0] ?? null;
}

function parsearPrecoPixNoHtml(html: string): { bruto: string; valor: number } | null {
  const $ = cheerio.load(html);
  const candidatos: string[] = [];

  $('*').each((_, el) => {
    const texto = $(el).text().replace(/\s+/g, ' ').trim();
    if (/pix/i.test(texto) && /R\$\s*[\d.]+,\d{2}/.test(texto) && texto.length < 220) {
      candidatos.push(texto);
    }
  });

  const pix = candidatos.find((t) => /no pix|à vista|a vista/i.test(t)) ?? candidatos[0];
  if (!pix) return null;
  const bruto = pix.match(/R\$\s*[\d.]+,\d{2}/)?.[0];
  if (!bruto) return null;
  const valor = extrairPreco(bruto);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return { bruto, valor };
}

async function parsearLg(html: string, item: ItemCatalogo): Promise<OfertaBruta> {
  const sku = extrairSkuLg(html) ?? item.sku ?? null;
  let precoBruto = '';
  let precoAVista = Number.NaN;
  let origem = '';

  if (sku) {
    try {
      const produto = await consultarGraphqlLg(sku);
      const pix = produto?.cheaper_price?.amount?.value;
      const final = produto?.price_range?.minimum_price?.final_price?.value;
      if (typeof pix === 'number' && pix > 0) {
        precoAVista = pix;
        precoBruto = String(pix);
        origem = `GraphQL cheaper_price (SKU ${produto?.sku ?? sku})`;
      } else if (typeof final === 'number' && final > 0) {
        precoAVista = final;
        precoBruto = String(final);
        origem = `GraphQL final_price (SKU ${produto?.sku ?? sku})`;
      }
    } catch (err) {
      console.warn(`[${item.loja}] GraphQL falhou (${detalheErro(err)}). Tentando HTML.`);
    }
  }

  if (!Number.isFinite(precoAVista)) {
    const htmlPix = parsearPrecoPixNoHtml(html);
    if (htmlPix) {
      precoAVista = htmlPix.valor;
      precoBruto = htmlPix.bruto;
      origem = 'HTML (tag Pix / à vista)';
    }
  }

  if (!Number.isFinite(precoAVista) || precoAVista <= 0) {
    throw new Error('preço à vista / Pix não encontrado no HTML nem no endpoint da LG');
  }

  console.log(
    `[${item.loja}] preço bruto extraído: "${precoBruto}" (${origem}) => ${formatBRL(precoAVista)}`
  );

  const $ = cheerio.load(html);
  const blocoFrete = $('[class*="delivery"], [class*="shipping"], [class*="frete"]')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .find((t) => /frete|entrega/i.test(t) && /R\$|gr[áa]tis/i.test(t) && t.length < 240);

  let frete = 0;
  if (blocoFrete) {
    if (/frete\s*gr[áa]tis/i.test(blocoFrete) && !/R\$\s*[\d.]+,\d{2}/.test(blocoFrete)) {
      frete = 0;
    } else {
      const valor = blocoFrete.match(/R\$\s*[\d.]+,\d{2}/)?.[0];
      if (valor) frete = extrairPreco(valor);
    }
    console.log(`[${item.loja}] frete bruto extraído: "${blocoFrete}" => ${formatBRL(frete)}`);
  } else {
    console.warn(`[${item.loja}] frete não localizado no HTML da loja oficial. Usando R$ 0,00.`);
  }

  return {
    loja: item.loja,
    titulo: item.produto,
    precoAVista,
    frete,
    url: item.url,
    fonteId: 'lg',
  };
}

async function rasparItem(item: ItemCatalogo): Promise<Oferta[]> {
  try {
    const html = await baixarHtml(item.url, { Referer: 'https://www.lg.com/br/' });
    return [toOferta(await parsearLg(html, item))];
  } catch (err) {
    console.error(`[${item.loja}] falha no scraping: ${detalheErro(err)}. Loja ignorada.`);
    return [];
  }
}

export const lgScraper: FonteScraper = {
  id: 'lg',
  async coletar(): Promise<Oferta[]> {
    const itens = CATALOGO.filter((item) => item.parser === 'lg');
    const settled = await Promise.allSettled(itens.map((item) => rasparItem(item)));
    return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  },
};
