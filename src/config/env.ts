import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_FALLBACK =
  'https://discord.com/api/webhooks/1544777880930750576/-r38boU8lxLLUiIKtBa0z0SGO3yMY8-hmppO1zGL47P64KsNiFW4MKZ99UCTx8WpNUIi';
const USER_ID_FALLBACK = '396823106360049664';

function lerEnv(chave: string, fallback: string): string {
  const valor = process.env[chave]?.trim();
  if (valor) return valor;
  console.warn(`[config] ${chave} ausente no ambiente. Usando fallback.`);
  return fallback;
}

export const WEBHOOK_URL = lerEnv('WEBHOOK_URL', WEBHOOK_FALLBACK);
export const USER_ID = lerEnv('USER_ID', USER_ID_FALLBACK);

/** Webhook exclusivo de supermercado. Sem fallback para o canal de ar-condicionado. */
export const DISCORD_SUPERMERCADO_WEBHOOK_URL = process.env.DISCORD_SUPERMERCADO_WEBHOOK_URL;

function normalizarWebhook(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function exigirWebhookSupermercado(): string {
  const url = DISCORD_SUPERMERCADO_WEBHOOK_URL?.trim();
  if (!url) {
    throw new Error('DISCORD_SUPERMERCADO_WEBHOOK_URL não configurado');
  }
  const ac = process.env.WEBHOOK_URL?.trim() || WEBHOOK_FALLBACK;
  if (normalizarWebhook(url) === normalizarWebhook(ac)) {
    throw new Error('DISCORD_SUPERMERCADO_WEBHOOK_URL não configurado');
  }
  return url;
}
