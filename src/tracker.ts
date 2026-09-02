import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_URL =
  'https://discord.com/api/webhooks/1544777880930750576/-r38boU8lxLLUiIKtBa0z0SGO3yMY8-hmppO1zGL47P64KsNiFW4MKZ99UCTx8WpNUIi';
const USER_ID = '396823106360049664';
const CEP = '60440-240';

interface Oferta {
  loja: string;
  produto: string;
  precoAVista: number;
  frete: number;
  url: string;
}

function totalComFrete(oferta: Oferta): number {
  return oferta.precoAVista + oferta.frete;
}

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Ofertas com links diretos das páginas de compra. */
async function coletarOfertas(): Promise<Oferta[]> {
  return [
    {
      loja: 'Amazon',
      produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
      // À vista no Pix + frete Leveros para CEP 60440-240
      precoAVista: 1925.1,
      frete: 129.99,
      url: 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H',
    },
    {
      loja: 'Loja Oficial LG',
      produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
      // À vista no Pix (9% de desconto) — página oficial LG
      precoAVista: 2128.49,
      frete: 0,
      url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
    },
  ];
}

function encontrarMelhorOferta(ofertas: Oferta[]): Oferta {
  return ofertas.reduce((melhor, atual) =>
    totalComFrete(atual) < totalComFrete(melhor) ? atual : melhor
  );
}

async function enviarParaDiscord(ofertas: Oferta[], melhor: Oferta): Promise<void> {
  const totalMelhor = totalComFrete(melhor);
  const ranking = [...ofertas]
    .sort((a, b) => totalComFrete(a) - totalComFrete(b))
    .map((o, i) => {
      const total = totalComFrete(o);
      const marca = o === melhor ? ' 🏆' : '';
      return (
        `**${i + 1}. ${o.loja}**${marca}\n` +
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
        title: '❄️ Monitor de Preços — Ar-condicionado',
        url: melhor.url,
        description:
          `Comparativo **Preço à Vista + Frete** para o CEP **${CEP}**.\n\n` +
          `### Menor valor total\n` +
          `**${melhor.loja}** — ${formatBRL(totalMelhor)}\n` +
          `${melhor.produto}`,
        color: 0x00b0f4,
        fields: [
          {
            name: 'Ranking de ofertas',
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
}

async function main(): Promise<void> {
  const ofertas = await coletarOfertas();

  if (ofertas.length === 0) {
    console.error('Nenhuma oferta encontrada.');
    return;
  }

  const melhor = encontrarMelhorOferta(ofertas);
  await enviarParaDiscord(ofertas, melhor);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});
