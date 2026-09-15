import dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_FALLBACK = 'https://discord.com/api/webhooks/URL_DO_WEBHOOK_AQUI';
const USER_ID_FALLBACK = '396823106360049664';

function lerEnv(chave: string, fallback: string): string {
  const valor = process.env[chave]?.trim();
  if (valor) return valor;
  console.warn(`[config] ${chave} ausente no ambiente. Usando fallback.`);
  return fallback;
}

export const WEBHOOK_URL = lerEnv('WEBHOOK_URL', WEBHOOK_FALLBACK);
export const USER_ID = lerEnv('USER_ID', USER_ID_FALLBACK);

/** Webhook exclusivo de supermercado. Sem fallback para o canal principal. */
export const DISCORD_SUPERMERCADO_WEBHOOK_URL = process.env.DISCORD_SUPERMERCADO_WEBHOOK_URL;

function normalizarWebhook(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function exigirWebhookSupermercado(): string {
  const url = DISCORD_SUPERMERCADO_WEBHOOK_URL?.trim();
  if (!url) {
    throw new Error('DISCORD_SUPERMERCADO_WEBHOOK_URL não configurado');
  }
  const mainWebhook = process.env.WEBHOOK_URL?.trim() || WEBHOOK_FALLBACK;
  if (normalizarWebhook(url) === normalizarWebhook(mainWebhook)) {
    throw new Error('DISCORD_SUPERMERCADO_WEBHOOK_URL não configurado');
  }
  return url;
}
