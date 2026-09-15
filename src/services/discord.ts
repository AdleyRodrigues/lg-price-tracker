import axios from 'axios';
import { USER_ID, WEBHOOK_URL } from '../config/env';
import { CEP, TAMANHO_PODIO, THRESHOLD_ALERTA_CRITICO } from '../config/regras';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { Oferta } from '../types/oferta';

export function corDoVencedor(loja: string): number {
  const nome = loja.toLowerCase();
  if (nome.includes('comunidade') || nome.includes('promobit')) return 0xe67e22;
  if (nome.includes('amazon')) return 0xff9900;
  if (nome.includes('lg')) return 0xa50034;
  return 0x2ecc71;
}

export function formatarItemField(o: Oferta, index: number): { name: string; value: string; inline: boolean } {
  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const cupom = o.cupomTag ? `\nCupom: \`${o.cupomTag}\`` : '';
  const freteTxt = o.frete === 0 ? 'frete grátis' : `frete ${formatBRL(o.frete)}`;
  return {
    name: `${medalhas[index] || `${index + 1}º`} — ${o.loja}`,
    value:
      `${o.titulo}\n` +
      `À vista ${formatBRL(o.precoAVista)} + ${freteTxt}\n` +
      `**Total: ${formatBRL(o.precoTotal)}**${cupom}\n` +
      `[Ver oferta](${o.url})`,
    inline: false,
  };
}

export function gerarRankingTexto(lugares: Oferta[]): string {
  return lugares.map((o, i) => `**${formatarItemField(o, i).name}**\n${formatarItemField(o, i).value}`).join('\n\n');
}

export function montarPayloadDiscord(
  ofertas: Oferta[],
  userId = USER_ID,
  cep = CEP,
  tamanho = TAMANHO_PODIO
) {
  const melhor = ofertas[0];
  if (!melhor) return null;

  const lugares = podio(ofertas, tamanho);
  const fields = lugares.map((o, i) => formatarItemField(o, i));
  const ehAlertaCritico = melhor.precoTotal <= THRESHOLD_ALERTA_CRITICO;
  const mencao = ehAlertaCritico ? `<@${userId}> 🚨 **OPORTUNIDADE ABAIXO DE ${formatBRL(THRESHOLD_ALERTA_CRITICO)}!**\n` : '';

  return {
    content: `${mencao}Pódio atualizado (Top ${lugares.length}) — menor custo total (à vista + frete).`,
    embeds: [
      {
        title: `🏆 ${melhor.loja} — ${formatBRL(melhor.precoTotal)}`,
        url: melhor.url,
        description:
          `Comparativo concorrente (Top ${lugares.length}) para o CEP **${cep}**.\n` +
          `Fontes em paralelo: Amazon, Loja Oficial LG e Comunidade (Promobit).\n\n` +
          `${melhor.titulo}`,
        color: corDoVencedor(melhor.loja),
        fields,
        footer: {
          text: `CEP ${cep} • ${new Date().toLocaleString('pt-BR')}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function enviarParaDiscord(ofertas: Oferta[]): Promise<void> {
  const payload = montarPayloadDiscord(ofertas);
  if (!payload) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º', '🎖️ 4º', '🎖️ 5º', '6º', '7º', '8º', '9º', '10º'];
  const lugares = podio(ofertas, TAMANHO_PODIO);

  await axios.post(WEBHOOK_URL, payload);
  console.log(`Notificação (Top ${lugares.length}) enviada ao Discord com sucesso.`);
  lugares.forEach((o, i) => {
    console.log(
      `  ${medalhas[i] || `${i + 1}º`} ${o.loja} — à vista ${formatBRL(o.precoAVista)} + frete ${formatBRL(o.frete)} = ${formatBRL(o.precoTotal)}${o.cupomTag ? ` [${o.cupomTag}]` : ''} | ${o.url}`
    );
  });
}
