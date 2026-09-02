import axios from 'axios';
import { USER_ID, WEBHOOK_URL } from '../config/env';
import { CEP } from '../config/regras';
import { podio } from '../domain/ranking';
import { formatBRL } from '../lib/preco';
import { Oferta } from '../types/oferta';

function corDoVencedor(loja: string): number {
  const nome = loja.toLowerCase();
  if (nome.includes('comunidade') || nome.includes('promobit')) return 0xe67e22;
  if (nome.includes('amazon')) return 0xff9900;
  if (nome.includes('lg')) return 0xa50034;
  return 0x2ecc71;
}

export async function enviarParaDiscord(ofertas: Oferta[]): Promise<void> {
  const melhor = ofertas[0];
  if (!melhor) {
    console.error('Nenhuma oferta para enviar.');
    return;
  }

  const medalhas = ['🥇 1º', '🥈 2º', '🥉 3º'];
  const lugares = podio(ofertas, 3);
  const ranking = lugares
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
  lugares.forEach((o, i) => {
    console.log(
      `  ${medalhas[i]} ${o.loja} — ${formatBRL(o.precoTotal)}${o.cupomTag ? ` [${o.cupomTag}]` : ''} | ${o.url}`
    );
  });
}
