import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL =
  'https://discord.com/api/webhooks/1544777880930750576/-r38boU8lxLLUiIKtBa0z0SGO3yMY8-hmppO1zGL47P64KsNiFW4MKZ99UCTx8WpNUIi';
const USER_ID = '396823106360049664';
const CEP = '60440-240';

const PROMOBIT_BUSCA_URL =
  'https://www.promobit.com.br/buscar?q=lg+dual+inverter+9000+frio';
const PROMOBIT_SEARCH_API =
  'https://api.promobit.com.br/search?q=lg+dual+inverter+9000+frio';
const FRETE_FALLBACK_COMUNIDADE = 100;
const PRECO_MINIMO_COMUNIDADE = 1500;
const FRETE_FALLBACK_LEVEROS = 129.99;
const FRETE_FALLBACK_WEBCONTINENTAL = 205;
const TITULO_BLOQUEADO_COMUNIDADE =
  /compacto?|quente|condensadora|evaporadora|12000|12\.000|placa/i;
const OFERTA_ENCERRADA = /encerrada|expirada|expired|finished|closed/i;

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="139", "Not=A?Brand";v="24", "Google Chrome";v="139"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

const http: AxiosInstance = axios.create({
  timeout: 20000,
  maxRedirects: 5,
  headers: CHROME_HEADERS,
  validateStatus: (status) => status < 500,
});

interface Oferta {
  loja: string;
  titulo: string;
  precoTotal: number;
  url: string;
  cupomTag?: string;
}

interface Fonte {
  loja: string;
  produto: string;
  url: string;
  parser: 'amazon' | 'lg';
  freteFallback?: number;
}

interface PromobitOffer {
  offer_title?: string;
  offer_price?: number;
  offer_coupon?: string | null;
  offer_slug?: string;
  offer_status_name?: string;
  offer_cta?: string | null;
  store_name?: string;
}

const FONTES: Fonte[] = [
  {
    loja: 'Amazon (Leveros)',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
    url: 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H',
    parser: 'amazon',
    freteFallback: FRETE_FALLBACK_LEVEROS,
  },
  {
    loja: 'Loja Oficial LG',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
    parser: 'lg',
  },
  {
    loja: 'Loja Oficial LG (S3-Q09AA31A)',
    produto: 'LG Dual Inverter Voice 9000 S3-Q09AA31A',
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa31a-1/?region_id=NST',
    parser: 'lg',
  },
];

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extrairPreco(texto: string): number {
  const normalizado = texto
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const match = normalizado.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function detalheErro(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const corpo = typeof data === 'string' ? data.slice(0, 160) : JSON.stringify(data);
    return [status, corpo || err.message].filter(Boolean).join(' ');
  }
  return err instanceof Error ? err.message : String(err);
}

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

function freteFallbackAmazon(fonte: Fonte, vendedor: string): number {
  const chave = `${fonte.loja} ${vendedor}`.toLowerCase();
  if (chave.includes('webcontinental')) return FRETE_FALLBACK_WEBCONTINENTAL;
  if (chave.includes('leveros')) return FRETE_FALLBACK_LEVEROS;
  return fonte.freteFallback ?? FRETE_FALLBACK_LEVEROS;
}

function parsearAmazon(html: string, fonte: Fonte): Oferta {
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

  console.log(`[${fonte.loja}] preço bruto extraído: "${precoBruto}" => ${formatBRL(precoAVista)}`);

  const vendedor = vendedorAmazon($);
  const fallbackFrete = freteFallbackAmazon(fonte, vendedor);
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
        `[${fonte.loja}] bloco de entrega sem valor. Fallback Fortaleza: ${formatBRL(fallbackFrete)}.`
      );
    }
  } else {
    console.warn(
      `[${fonte.loja}] frete regional não veio no HTML. Fallback Fortaleza: ${formatBRL(fallbackFrete)}.`
    );
  }

  console.log(
    `[${fonte.loja}] frete bruto extraído: "${freteBruto || '(não encontrado)'}" => ${formatBRL(frete)}`
  );

  return {
    loja: fonte.loja,
    titulo: fonte.produto,
    precoTotal: precoAVista + frete,
    url: fonte.url,
  };
}

function extrairSkuLg(html: string): string | null {
  return (
    html.match(/const sku = "([^"]+)"/)?.[1] ??
    html.match(/"sku":\s*`([^`]+)`/)?.[1] ??
    html.match(/"sku"\s*:\s*"([^"]+)"/)?.[1] ??
    null
  );
}

interface LgGraphqlProduto {
  name?: string;
  sku?: string;
  cheaper_price?: { amount?: { value?: number } };
  price_range?: { minimum_price?: { final_price?: { value?: number } } };
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

async function parsearLg(html: string, fonte: Fonte): Promise<Oferta> {
  const sku = extrairSkuLg(html);
  let precoBruto = '';
  let precoAVista = Number.NaN;
  let origem = '';

  if (sku) {
    try {
      const item = await consultarGraphqlLg(sku);
      const pix = item?.cheaper_price?.amount?.value;
      const final = item?.price_range?.minimum_price?.final_price?.value;
      if (typeof pix === 'number' && pix > 0) {
        precoAVista = pix;
        precoBruto = String(pix);
        origem = `GraphQL cheaper_price (SKU ${item?.sku ?? sku})`;
      } else if (typeof final === 'number' && final > 0) {
        precoAVista = final;
        precoBruto = String(final);
        origem = `GraphQL final_price (SKU ${item?.sku ?? sku})`;
      }
    } catch (err) {
      console.warn(`[${fonte.loja}] GraphQL falhou (${detalheErro(err)}). Tentando HTML.`);
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
    `[${fonte.loja}] preço bruto extraído: "${precoBruto}" (${origem}) => ${formatBRL(precoAVista)}`
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
    console.log(`[${fonte.loja}] frete bruto extraído: "${blocoFrete}" => ${formatBRL(frete)}`);
  } else {
    console.warn(`[${fonte.loja}] frete não localizado no HTML da loja oficial. Usando R$ 0,00.`);
  }

  return {
    loja: fonte.loja,
    titulo: fonte.produto,
    precoTotal: precoAVista + frete,
    url: fonte.url,
  };
}

async function baixarHtml(fonte: Fonte): Promise<string> {
  const resposta = await http.get<string>(fonte.url, {
    headers: {
      ...CHROME_HEADERS,
      Referer: fonte.parser === 'amazon' ? 'https://www.amazon.com.br/' : 'https://www.lg.com/br/',
    },
  });

  if (resposta.status === 404 || resposta.status === 410) throw new Error(`página retornou ${resposta.status}`);
  if (resposta.status === 503) throw new Error('HTTP 503 (possível bloqueio anti-bot)');
  if (resposta.status >= 400) throw new Error(`HTTP ${resposta.status}`);
  const html = typeof resposta.data === 'string' ? resposta.data : '';
  if (!html) throw new Error('HTML vazio');
  return html;
}

async function consultarFonte(fonte: Fonte): Promise<Oferta[]> {
  try {
    const html = await baixarHtml(fonte);
    const oferta =
      fonte.parser === 'amazon' ? parsearAmazon(html, fonte) : await parsearLg(html, fonte);
    return [oferta];
  } catch (err) {
    console.error(`[${fonte.loja}] falha no scraping: ${detalheErro(err)}. Loja ignorada.`);
    return [];
  }
}

function ofertaComunidadeValida(titulo: string, preco: number, status: string): boolean {
  if (!titulo) return false;
  if (TITULO_BLOQUEADO_COMUNIDADE.test(titulo)) {
    console.log(`[Comunidade (Promobit)] descartado pelo título: "${titulo}"`);
    return false;
  }
  if (!Number.isFinite(preco) || preco < PRECO_MINIMO_COMUNIDADE) return false;
  if (OFERTA_ENCERRADA.test(status)) return false;
  return true;
}

function montarOfertaComunidade(
  titulo: string,
  precoPostagem: number,
  url: string,
  cupomMencionado: boolean,
  cupomCodigo?: string | null
): Oferta {
  const precoTotal = precoPostagem + FRETE_FALLBACK_COMUNIDADE;
  const oferta: Oferta = {
    loja: 'Comunidade (Promobit)',
    titulo,
    precoTotal,
    url,
  };
  if (cupomMencionado || cupomCodigo) {
    oferta.cupomTag = cupomCodigo?.trim() || 'Cupom';
  }
  return oferta;
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

    if (!ofertaComunidadeValida(titulo, preco, texto)) continue;

    console.log(`[Comunidade (Promobit)] card HTML preço bruto: "${precoBruto}" => ${formatBRL(preco)}`);
    ofertas.push(
      montarOfertaComunidade(titulo, preco, url, /cupom/i.test(texto), texto.match(/cupom[:\s]+([A-Z0-9_-]{3,})/i)?.[1])
    );
  }

  return ofertas;
}

function mapearJsonPromobit(item: PromobitOffer): Oferta | null {
  const titulo = item.offer_title?.trim() ?? '';
  const preco = Number(item.offer_price);
  const status = `${item.offer_status_name ?? ''} ${item.offer_cta ?? ''}`;
  if (!ofertaComunidadeValida(titulo, preco, status)) return null;

  const slug = item.offer_slug ?? '';
  const url = slug
    ? `https://www.promobit.com.br/oferta/${slug}`
    : PROMOBIT_BUSCA_URL;

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

async function buscarOfertasComunidade(): Promise<Oferta[]> {
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
      const items = jsonRes.value.data.active_offers ?? [];
      for (const item of items) {
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
}

async function buscarOfertasAmazon(): Promise<Oferta[]> {
  const fontes = FONTES.filter((f) => f.parser === 'amazon');
  const settled = await Promise.allSettled(fontes.map((fonte) => consultarFonte(fonte)));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function buscarOfertasLg(): Promise<Oferta[]> {
  const fontes = FONTES.filter((f) => f.parser === 'lg');
  const settled = await Promise.allSettled(fontes.map((fonte) => consultarFonte(fonte)));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function coletarOfertas(): Promise<Oferta[]> {
  const settled = await Promise.allSettled([
    buscarOfertasAmazon(),
    buscarOfertasLg(),
    buscarOfertasComunidade(),
  ]);

  const ofertasConsolidadas: Oferta[] = [];
  for (const resultado of settled) {
    if (resultado.status === 'fulfilled') {
      ofertasConsolidadas.push(...resultado.value);
    } else {
      console.error(`Fonte falhou por completo: ${detalheErro(resultado.reason)}`);
    }
  }

  return ofertasConsolidadas.sort((a, b) => a.precoTotal - b.precoTotal);
}

function corDoVencedor(loja: string): number {
  const nome = loja.toLowerCase();
  if (nome.includes('comunidade') || nome.includes('promobit')) return 0xe67e22;
  if (nome.includes('amazon')) return 0xff9900;
  if (nome.includes('lg')) return 0xa50034;
  return 0x2ecc71;
}

async function enviarParaDiscord(ofertas: Oferta[]): Promise<void> {
  const melhor = ofertas[0];
  if (!melhor) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º'];
  const podio = ofertas.slice(0, 3);
  const ranking = podio
    .map((o, i) => {
      const cupom = o.cupomTag ? `\nCupom: \`${o.cupomTag}\`` : '';
      return (
        `**${medalhas[i]} — ${o.loja}**\n` +
        `${o.titulo}\n` +
        `**Total: ${formatBRL(o.precoTotal)}**${cupom}\n` +
        `[Ver oferta](${o.url})`
      );
    })
    .join('\n\n');

  const payload = {
    content: `<@${USER_ID}> Pódio atualizado — menor custo total (à vista + frete).`,
    embeds: [
      {
        title: `🏆 ${melhor.loja} — ${formatBRL(melhor.precoTotal)}`,
        url: melhor.url,
        description:
          `Comparativo concorrente para o CEP **${CEP}**.\n` +
          `Fontes em paralelo: Amazon, Loja Oficial LG e Comunidade (Promobit).\n\n` +
          `${melhor.titulo}`,
        color: corDoVencedor(melhor.loja),
        fields: [
          {
            name: 'Pódio',
            value: ranking,
          },
        ],
        footer: {
          text: `CEP ${CEP} • ${new Date().toLocaleString('pt-BR')}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await axios.post(WEBHOOK_URL, payload);
  console.log('Notificação enviada ao Discord com sucesso.');
  podio.forEach((o, i) => {
    console.log(
      `  ${medalhas[i]} ${o.loja} — ${formatBRL(o.precoTotal)}${o.cupomTag ? ` [${o.cupomTag}]` : ''} | ${o.url}`
    );
  });
}

async function main(): Promise<void> {
  const ofertasConsolidadas = await coletarOfertas();

  if (ofertasConsolidadas.length === 0) {
    console.warn('Nenhuma oferta ativa após as consultas. Nada enviado ao Discord.');
    return;
  }

  await enviarParaDiscord(ofertasConsolidadas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});
