import axios from 'axios';
import { exigirWebhookSupermercado } from '../config/env';
import { formatBRL } from '../lib/preco';
import {
  CategoriaRecomendada,
  OfertaSupermercadoClassificada,
} from '../types/supermercado';

const USERNAME_SUPERMERCADO = 'Mercado Livre — Achados';
const AVATAR_SUPERMERCADO =
  'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.22.8/mercadolibre/logo__small@2x.png';
const COR_PROMOCIONAL = 0x00a650;
const LIMITE_CAMPO = 1000;

const BLOCOS: { categoria: CategoriaRecomendada; nome: string }[] = [
  { categoria: 'Limpeza', nome: '🧼 Produtos de Limpeza' },
  { categoria: 'Alimentos & Bebidas', nome: '🥫 Alimentos & Bebidas' },
  { categoria: 'Higiene Pessoal', nome: '🪥 Higiene Pessoal' },
];

function encurtarTitulo(titulo: string, max = 72): string {
  const limpo = titulo.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max - 1).trimEnd()}…`;
}

function linhaOferta(oferta: OfertaSupermercadoClassificada): string {
  const original = oferta.precoOriginal ? ` ~~(${formatBRL(oferta.precoOriginal)})~~` : '';
  return `• **${oferta.descontoPercentual}% OFF** — [${encurtarTitulo(oferta.titulo)}](${oferta.url}) | **${formatBRL(oferta.precoAtual)}**${original}`;
}

function partirCampo(nome: string, linhas: string[]): { name: string; value: string; inline: boolean }[] {
  const campos: { name: string; value: string; inline: boolean }[] = [];
  let atual: string[] = [];
  let tamanho = 0;
  let parte = 0;

  const flush = () => {
    if (atual.length === 0) return;
    campos.push({
      name: parte === 0 ? nome : `${nome} (cont.)`,
      value: atual.join('\n'),
      inline: false,
    });
    parte += 1;
    atual = [];
    tamanho = 0;
  };

  for (const linha of linhas) {
    const extra = (atual.length === 0 ? 0 : 1) + linha.length;
    if (atual.length > 0 && tamanho + extra > LIMITE_CAMPO) flush();
    atual.push(linha);
    tamanho += extra;
  }
  flush();
  return campos;
}

function montarCampos(ofertas: OfertaSupermercadoClassificada[]) {
  const campos = [];
  for (const bloco of BLOCOS) {
    const itens = ofertas
      .filter((oferta) => oferta.categoria === bloco.categoria)
      .sort((a, b) => b.descontoPercentual - a.descontoPercentual || a.precoAtual - b.precoAtual);
    if (itens.length === 0) continue;
    campos.push(...partirCampo(bloco.nome, itens.map(linhaOferta)));
  }
  return campos.slice(0, 25);
}

function montarEmbeds(ofertas: OfertaSupermercadoClassificada[]) {
  const fields = montarCampos(ofertas);
  return [
    {
      title: `🛒 Recomendações de supermercado — ${ofertas.length} oferta(s)`,
      description: 'Seleção com **pelo menos 35% OFF**, agrupada por categoria.',
      color: COR_PROMOCIONAL,
      fields,
      footer: {
        text: `Mercado Livre • supermercado • ${new Date().toLocaleString('pt-BR')}`,
      },
      timestamp: new Date().toISOString(),
    },
  ];
}

function idDoWebhook(url: string): string {
  return url.match(/webhooks\/(\d+)/)?.[1] ?? 'desconhecido';
}

export async function enviarPromocoesSupermercado(
  ofertas: OfertaSupermercadoClassificada[]
): Promise<void> {
  const webhook = exigirWebhookSupermercado();

  if (ofertas.length === 0) {
    console.log('[discord-supermercado] Nenhuma oferta nova para enviar.');
    return;
  }

  console.log(`[discord-supermercado] destino webhook ${idDoWebhook(webhook)}`);

  try {
    await axios.post(webhook, {
      username: USERNAME_SUPERMERCADO,
      avatar_url: AVATAR_SUPERMERCADO,
      embeds: montarEmbeds(ofertas),
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        '[discord-supermercado] Discord recusou o payload:',
        err.response?.status,
        JSON.stringify(err.response?.data)
      );
    }
    throw err;
  }
  console.log(
    `[discord-supermercado] ${ofertas.length} oferta(s) enviada(s) ao Discord.`
  );
}
