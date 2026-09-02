import dotenv from 'dotenv';

dotenv.config();

import { exigirWebhookSupermercado } from './config/env';
import { SELECAO_MINIMA_SUPERMERCADO } from './config/regras-supermercado';
import {
  filtrarPromocoesMuitoBoas,
  selecionarRecomendacoes,
} from './domain/filtros-supermercado';
import { formatBRL } from './lib/preco';
import { coletarOfertasSupermercado } from './scrapers/mercado-livre-supermercado';
import {
  listarOfertasNovas,
  registrarOfertasEnviadas,
} from './services/alertas-enviados';
import { enviarPromocoesSupermercado } from './services/discord-supermercado';
import { OfertaSupermercadoClassificada } from './types/supermercado';

exigirWebhookSupermercado();

function contarPorCategoria(ofertas: OfertaSupermercadoClassificada[]): string {
  const totais = { Limpeza: 0, 'Alimentos & Bebidas': 0, 'Higiene Pessoal': 0 };
  for (const oferta of ofertas) {
    totais[oferta.categoria] += 1;
  }
  return `limpeza=${totais.Limpeza} alimentos=${totais['Alimentos & Bebidas']} higiene=${totais['Higiene Pessoal']}`;
}

async function main(): Promise<void> {
  const coletadas = await coletarOfertasSupermercado();
  const validas = filtrarPromocoesMuitoBoas(coletadas);
  const novas = listarOfertasNovas(validas);
  const selecao = selecionarRecomendacoes(novas);

  console.log(
    `[tracker-supermercado] coletadas=${coletadas.length} validas=${validas.length} novas=${novas.length} selecao=${selecao.length} (${contarPorCategoria(selecao)})`
  );

  if (validas.length === 0) {
    console.warn('Nenhuma promoção ≥35% OFF nas categorias Limpeza, Alimentos ou Higiene.');
    return;
  }

  for (const oferta of selecao) {
    const original = oferta.precoOriginal ? ` (de ${formatBRL(oferta.precoOriginal)})` : '';
    console.log(
      `  • [${oferta.categoria}] ${oferta.descontoPercentual}% OFF | ${formatBRL(oferta.precoAtual)}${original} | ${oferta.titulo}`
    );
  }

  if (selecao.length === 0) {
    console.log('Todas as promoções filtradas já foram notificadas. Nada enviado.');
    return;
  }

  if (selecao.length < SELECAO_MINIMA_SUPERMERCADO) {
    console.warn(
      `[tracker-supermercado] Seleção com ${selecao.length} item(ns); o alvo é ${SELECAO_MINIMA_SUPERMERCADO}+.`
    );
  }

  await enviarPromocoesSupermercado(selecao);
  registrarOfertasEnviadas(selecao);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker de supermercado:', err);
  process.exit(1);
});
