import axios, { AxiosInstance } from 'axios';

export const CHROME_HEADERS = {
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

export const http: AxiosInstance = axios.create({
  timeout: 20000,
  maxRedirects: 5,
  headers: CHROME_HEADERS,
  validateStatus: (status) => status < 500,
});

export function detalheErro(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    const corpo = typeof data === 'string' ? data.slice(0, 160) : JSON.stringify(data);
    return [status, corpo || err.message].filter(Boolean).join(' ');
  }
  return err instanceof Error ? err.message : String(err);
}

export async function baixarHtml(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const resposta = await http.get<string>(url, {
    headers: { ...CHROME_HEADERS, ...extraHeaders },
  });

  if (resposta.status === 404 || resposta.status === 410) {
    throw new Error(`página retornou ${resposta.status}`);
  }
  if (resposta.status === 503) {
    throw new Error('HTTP 503 (possível bloqueio anti-bot)');
  }
  if (resposta.status >= 400) {
    throw new Error(`HTTP ${resposta.status}`);
  }

  const html = typeof resposta.data === 'string' ? resposta.data : '';
  if (!html) throw new Error('HTML vazio');
  return html;
}
