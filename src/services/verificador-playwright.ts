import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { extrairPreco, formatBRL } from '../lib/preco';
import { Oferta, toOferta } from '../types/oferta';
import { CHROME_HEADERS } from '../config/http';

export interface ResultadoVerificacao {
  oferta: Oferta;
  valida: boolean;
  motivo?: string;
  precoConfirmado?: number;
  freteConfirmado?: number;
}

export async function verificarPromobit(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // 1. Checa se o botão ou badge de oferta encerrada está visível
  const encerradaVisivel = await page
    .locator('button:has-text("Oferta encerrada"), a:has-text("Oferta encerrada"), div:has-text("Oferta encerrada"), span:has-text("Oferta encerrada")')
    .first()
    .isVisible()
    .catch(() => false);

  if (encerradaVisivel) {
    return {
      oferta,
      valida: false,
      motivo: 'Botão "Oferta encerrada" visível no frontend do Promobit',
    };
  }

  // 2. Checa se o botão de ação "Ir para a loja" / "Pegar promoção" está presente
  const botaoIrLoja = await page
    .locator('button:has-text("Ir para a loja"), a:has-text("Ir para a loja"), a:has-text("Pegar promoção"), button:has-text("Pegar promoção")')
    .first()
    .isVisible()
    .catch(() => false);

  const temAlerta = await page
    .locator('button:has-text("Ativar Alerta"), a:has-text("Ativar Alerta")')
    .first()
    .isVisible()
    .catch(() => false);

  // Se não tem botão de ir pra loja e só tem "Ativar Alerta", a oferta encerrou
  if (!botaoIrLoja && temAlerta) {
    return {
      oferta,
      valida: false,
      motivo: 'Botão "Ir para a loja" ausente (oferta encerrada com apenas "Ativar Alerta")',
    };
  }

  // 3. Checa texto de preço renderizado no DOM
  const precoTexto = await page
    .locator('h2:has-text("R$"), div:has-text("R$"), span:has-text("R$")')
    .filter({ hasText: /R\$\s*[\d.]+,\d{2}/ })
    .first()
    .innerText()
    .catch(() => '');

  const match = precoTexto.match(/R\$\s*[\d.]+,\d{2}/);
  let precoConfirmado = oferta.precoAVista;
  if (match) {
    const extraido = extrairPreco(match[0]);
    if (extraido > 0) precoConfirmado = extraido;
  }

  return {
    oferta,
    valida: true,
    precoConfirmado,
  };
}

export async function verificarAmazon(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // 1. Checa indisponibilidade
  const indisponivel = await page
    .locator('#availability:has-text("Não disponível"), #availability:has-text("Atualmente indisponível"), #outOfStock')
    .first()
    .isVisible()
    .catch(() => false);

  if (indisponivel) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / fora de estoque na Amazon',
    };
  }

  // 2. Extrai preço renderizado no buybox
  const seletorPreco = '#corePrice_feature_div .a-offscreen, .apex-pricetopay-value .a-offscreen, #corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen, .priceToPay .a-offscreen';
  const textoPreco = await page
    .locator(seletorPreco)
    .first()
    .innerText()
    .catch(() => '');

  let precoConfirmado = oferta.precoAVista;
  const match = textoPreco.match(/R\$\s*[\d.]+,\d{2}/);
  if (match) {
    const extraido = extrairPreco(match[0]);
    if (extraido > 0) precoConfirmado = extraido;
  }

  return {
    oferta,
    valida: true,
    precoConfirmado,
  };
}

export async function verificarLg(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  await page.goto(oferta.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const esgotado = await page
    .locator('text=/produto indisponível|esgotado|out of stock/i')
    .first()
    .isVisible()
    .catch(() => false);

  if (esgotado) {
    return {
      oferta,
      valida: false,
      motivo: 'Produto indisponível / esgotado na Loja Oficial LG',
    };
  }

  return {
    oferta,
    valida: true,
    precoConfirmado: oferta.precoAVista,
  };
}

export async function verificarOfertaComPlaywright(page: Page, oferta: Oferta): Promise<ResultadoVerificacao> {
  try {
    if (oferta.fonteId === 'promobit' || oferta.url.includes('promobit.com.br')) {
      return await verificarPromobit(page, oferta);
    }
    if (oferta.fonteId === 'amazon' || oferta.url.includes('amazon.com.br')) {
      return await verificarAmazon(page, oferta);
    }
    if (oferta.fonteId === 'lg' || oferta.url.includes('lg.com')) {
      return await verificarLg(page, oferta);
    }
    return { oferta, valida: true };
  } catch (err: any) {
    console.warn(`[Playwright] Erro ao verificar oferta ${oferta.url}: ${err.message}. Mantendo se não for falha crítica.`);
    return { oferta, valida: true };
  }
}

export async function validarTopOfertasComPlaywright(
  candidatas: Oferta[],
  maxTop = 5
): Promise<Oferta[]> {
  let browser: Browser | null = null;
  const ofertasValidadas: Oferta[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context: BrowserContext = await browser.newContext({
      userAgent: CHROME_HEADERS['User-Agent'],
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    const page = await context.newPage();

    for (const oferta of candidatas) {
      if (ofertasValidadas.length >= maxTop) break;

      console.log(`[Playwright Frontend] Verificando [${oferta.loja}] ${oferta.titulo} (${oferta.url})...`);
      const resultado = await verificarOfertaComPlaywright(page, oferta);

      if (!resultado.valida) {
        console.warn(`[Playwright Frontend] ❌ OFERTA REJEITADA: ${resultado.motivo} | ${oferta.url}`);
        continue;
      }

      let ofertaFinal = oferta;
      if (resultado.precoConfirmado && resultado.precoConfirmado !== oferta.precoAVista) {
        console.log(
          `[Playwright Frontend] Preço atualizado no front: ${formatBRL(oferta.precoAVista)} -> ${formatBRL(resultado.precoConfirmado)}`
        );
        ofertaFinal = toOferta({
          ...oferta,
          precoAVista: resultado.precoConfirmado,
          fonteId: oferta.fonteId || 'verificado',
        });
      }

      console.log(`[Playwright Frontend] ✅ OFERTA APROVADA: ${ofertaFinal.loja} - ${formatBRL(ofertaFinal.precoTotal)}`);
      ofertasValidadas.push(ofertaFinal);
    }
  } catch (err: any) {
    console.error(`[Playwright Frontend] Erro geral no validador Playwright: ${err.message}`);
    // Se Playwright falhar catastroficamente (ex: ambiente sem browser), retorna as candidatas brutas
    return candidatas.slice(0, maxTop);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return ofertasValidadas;
}
