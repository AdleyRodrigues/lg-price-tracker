import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL =
  'https://discord.com/api/webhooks/1544777880930750576/-r38boU8lxLLUiIKtBa0z0SGO3yMY8-hmppO1zGL47P64KsNiFW4MKZ99UCTx8WpNUIi';
const USER_ID = '396823106360049664';
const CEP = '60440-240';

const ML_SEARCH_URL =
  'https://api.mercadolibre.com/sites/MLB/search?q=LG+Dual+Inverter+Voice+9000+Frio+220V';
const PRECO_MINIMO_ML = 1600;
const FRETE_ESTIMADO_FORTALEZA = 120;
const ML_MELHORES_RESULTADOS = 2;
const RANKING_MAX = 5;
const TITULO_OBRIGATORIO = /9000|9\.000/;
const TITULO_BLOQUEADO =
  /quente|condensadora|evaporadora|placa|suporte|controle|compact/i;
const FORA_DE_ESTOQUE =
  /schema\.org\/OutOfStock|"availability"\s*:\s*"OutOfStock"|itemprop="availability"[^>]*OutOfStock/i;

const HTTP_HEADERS = {
  Accept: 'text/html,application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

interface Oferta {
  loja: string;
  produto: string;
  precoAVista: number;
  frete: number;
  url: string;
}

interface FonteFixa {
  loja: string;
  produto: string;
  precoAVista: number;
  frete: number;
  url: string;
}

interface MercadoLivreItem {
  title: string;
  price: number;
  permalink: string;
  official_store_name?: string | null;
  seller?: { nickname?: string };
  shipping?: { free_shipping?: boolean };
}

const FONTES_FIXAS: FonteFixa[] = [
  {
    loja: 'Amazon (Leveros)',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
    precoAVista: 1925.1,
    frete: 129.99,
    url: 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H',
  },
  {
    loja: 'Loja Oficial LG',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
    precoAVista: 2128.49,
    frete: 0,
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
  },
  {
    loja: 'Loja Oficial LG (S3-Q09AA31A)',
    produto: 'LG Dual Inverter Voice 9000 S3-Q09AA31A',
    precoAVista: 2611.01,
    frete: 126,
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa31a-1/?region_id=NST',
  },
];

function totalComFrete(oferta: Oferta): number {
  return oferta.precoAVista + oferta.frete;
}

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function detalheErro(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const corpo = typeof data === 'string' ? data.slice(0, 120) : JSON.stringify(data);
    return [status, corpo || err.message].filter(Boolean).join(' ');
  }
  return String(err);
}

async function consultarFonteFixa(fonte: FonteFixa): Promise<Oferta | null> {
  try {
    const resposta = await axios.get<string>(fonte.url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: HTTP_HEADERS,
      validateStatus: (status) => status < 500,
    });

    if (resposta.status === 404 || resposta.status === 410) {
      console.warn(`${fonte.loja}: página retornou ${resposta.status}. Ignorando esta loja.`);
      return null;
    }

    if (resposta.status >= 400) {
      console.warn(`${fonte.loja}: HTTP ${resposta.status}. Ignorando esta loja.`);
      return null;
    }

    const html = typeof resposta.data === 'string' ? resposta.data : '';
    if (html && FORA_DE_ESTOQUE.test(html)) {
      console.warn(`${fonte.loja}: produto fora de estoque. Ignorando esta loja.`);
      return null;
    }

    return {
      loja: fonte.loja,
      produto: fonte.produto,
      precoAVista: fonte.precoAVista,
      frete: fonte.frete,
      url: fonte.url,
    };
  } catch (err) {
    console.warn(`${fonte.loja}: falha na consulta (${detalheErro(err)}). Ignorando esta loja.`);
    return null;
  }
}

function tituloValidoMl(titulo: string): boolean {
  const texto = titulo.toLowerCase();
  return TITULO_OBRIGATORIO.test(texto) && !TITULO_BLOQUEADO.test(texto);
}

function nomeVendedorMl(item: MercadoLivreItem): string {
  const oficial = item.official_store_name?.trim();
  const nick = item.seller?.nickname?.trim();
  return oficial || nick || 'vendedor';
}

function mapearOfertaMl(item: MercadoLivreItem): Oferta {
  return {
    loja: `Mercado Livre (${nomeVendedorMl(item)})`,
    produto: item.title,
    precoAVista: item.price,
    frete: item.shipping?.free_shipping ? 0 : FRETE_ESTIMADO_FORTALEZA,
    url: item.permalink,
  };
}

async function buscarOfertasMercadoLivre(): Promise<Oferta[]> {
  try {
    const { data } = await axios.get<{ results?: MercadoLivreItem[] }>(ML_SEARCH_URL, {
      timeout: 15000,
      headers: { Accept: 'application/json' },
      validateStatus: (status) => status < 500,
    });

    if (!data || typeof data !== 'object' || !('results' in data)) {
      console.warn('Mercado Livre: resposta inválida ou bloqueada. Ignorando esta loja.');
      return [];
    }

    const validas = (data.results ?? [])
      .filter((item) => tituloValidoMl(item.title) && item.price >= PRECO_MINIMO_ML)
      .map(mapearOfertaMl)
      .sort((a, b) => totalComFrete(a) - totalComFrete(b))
      .slice(0, ML_MELHORES_RESULTADOS);

    console.log(`Mercado Livre: ${validas.length} oferta(s) válida(s) após filtros.`);
    return validas;
  } catch (err) {
    console.warn(
      `Mercado Livre: falha na consulta (${detalheErro(err)}). Ignorando esta loja.`
    );
    return [];
  }
}

async function coletarOfertas(): Promise<Oferta[]> {
  const consultasFixas = FONTES_FIXAS.map((fonte) => consultarFonteFixa(fonte));
  const [mercadoLivre, ...fixas] = await Promise.all([
    buscarOfertasMercadoLivre(),
    ...consultasFixas,
  ]);

  return [...fixas.filter((oferta): oferta is Oferta => oferta !== null), ...mercadoLivre].sort(
    (a, b) => totalComFrete(a) - totalComFrete(b)
  );
}

function corDoVencedor(loja: string): number {
  const nome = loja.toLowerCase();
  if (nome.includes('mercado livre')) return 0xffe600;
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

  const totalMelhor = totalComFrete(melhor);
  const rankingSize = Math.min(RANKING_MAX, ofertas.length);
  const ranking = ofertas
    .slice(0, rankingSize)
    .map((o, i) => {
      const total = totalComFrete(o);
      const marca = i === 0 ? ' 🏆' : '';
      return (
        `**${i + 1}. ${o.loja}**${marca}\n` +
        `${o.produto}\n` +
        `À vista: ${formatBRL(o.precoAVista)} | Frete (${CEP}): ${formatBRL(o.frete)}\n` +
        `**Total: ${formatBRL(total)}**\n` +
        `[Ver oferta](${o.url})`
      );
    })
    .join('\n\n');

  const payload = {
    content: `<@${USER_ID}> Melhor oferta encontrada!`,
    embeds: [
      {
        title: `🏆 ${melhor.loja} — ${formatBRL(totalMelhor)}`,
        url: melhor.url,
        description:
          `Comparativo **Preço à Vista + Frete** para o CEP **${CEP}**.\n` +
          `Fontes: Amazon, Loja Oficial LG e Mercado Livre.\n\n` +
          `${melhor.produto}`,
        color: corDoVencedor(melhor.loja),
        fields: [
          {
            name: `Top ${rankingSize} ofertas (menor total)`,
            value: ranking,
          },
          {
            name: 'Detalhe do vencedor',
            value:
              `À vista: ${formatBRL(melhor.precoAVista)}\n` +
              `Frete: ${formatBRL(melhor.frete)}\n` +
              `**Total: ${formatBRL(totalMelhor)}**`,
            inline: true,
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
  console.log(
    `Melhor oferta: ${melhor.loja} — ${formatBRL(totalMelhor)} (à vista + frete)`
  );
  ofertas.slice(0, rankingSize).forEach((o, i) => {
    console.log(
      `  ${i + 1}. ${o.loja} — ${formatBRL(totalComFrete(o))} | ${o.url}`
    );
  });
}

async function main(): Promise<void> {
  const ofertas = await coletarOfertas();

  if (ofertas.length === 0) {
    console.warn('Nenhuma oferta ativa após as consultas. Nada enviado ao Discord.');
    return;
  }

  await enviarParaDiscord(ofertas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});
