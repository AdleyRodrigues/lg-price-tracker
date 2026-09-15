import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';
import { ItemCatalogo } from '../src/config/catalogo';
import {
  freteFallbackAmazon,
  parsearAmazon,
  primeiroTexto,
  vendedorAmazon,
} from '../src/scrapers/amazon';

describe('amazon scraper', () => {
  const itemExemplo: ItemCatalogo = {
    loja: 'Amazon (Leveros)',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
    sku: 'S3-Q09AA31F',
    url: 'https://www.amazon.com.br/dp/B0GQJP852H',
    parser: 'amazon',
    freteFallback: 86.98,
  };

  describe('vendedorAmazon', () => {
    it('identifica vendedor terceiro a partir de tags do HTML', () => {
      const html = '<div id="merchant-info">Vendido e enviado por Leveros</div>';
      const $ = cheerio.load(html);
      expect(vendedorAmazon($)).toContain('Leveros');
    });
  });

  describe('freteFallbackAmazon', () => {
    it('retorna fallback específico de Leveros (86.98)', () => {
      expect(freteFallbackAmazon(itemExemplo, 'Leveros')).toBe(86.98);
    });

    it('retorna fallback específico de Webcontinental (205)', () => {
      expect(freteFallbackAmazon(itemExemplo, 'Webcontinental')).toBe(205);
    });
  });

  describe('parsearAmazon', () => {
    it('extrai preço e frete explícito de entrega com sucesso', () => {
      const html = `
        <html>
          <body>
            <div id="corePrice_feature_div">
              <span class="a-offscreen">R$ 2.072,83</span>
            </div>
            <div id="merchant-info">Vendido por Leveros</div>
            <div id="deliveryBlockMessage">
              <span>Entrega R$ 86,98 21 - 25 de Setembro.</span>
            </div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(2072.83);
      expect(bruta.frete).toBe(86.98);
      expect(bruta.loja).toBe('Amazon (Leveros)');
      expect(bruta.fonteId).toBe('amazon');
    });

    it('aplica fallback de frete quando o HTML diz entrega grátis mas o vendedor é 3P (Leveros)', () => {
      const html = `
        <html>
          <body>
            <div class="priceToPay">
              <span class="a-offscreen">R$ 2.072,83</span>
            </div>
            <div id="merchant-info">Vendido por Leveros</div>
            <div id="deliveryBlockMessage">
              <span>Entrega GRÁTIS</span>
            </div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(2072.83);
      expect(bruta.frete).toBe(86.98);
    });

    it('ignora preços de carrosséis/outras ofertas (R$ 2.139,00) e extrai o preço real do buybox (R$ 2.072,83)', () => {
      const html = `
        <html>
          <body>
            <div id="p13n-desktop-sims-fbt">
              <span class="a-price"><span class="a-offscreen">R$ 2.139,00</span></span>
            </div>
            <div id="aod-ingress-link">
              <span class="a-price"><span class="a-offscreen">R$ 2.139,00</span></span>
            </div>
            <div id="centerCol">
              <div id="corePrice_feature_div">
                <span class="a-price aok-align-center apex-pricetopay-value">
                  <span class="a-offscreen">R$ 2.072,83</span>
                </span>
              </div>
            </div>
            <div id="sellerProfileTriggerId">FRIOPECAS</div>
            <div id="deliveryBlockMessage">
              <span>Entrega R$ 86,98 21 - 25 de Setembro</span>
            </div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(2072.83);
      expect(bruta.frete).toBe(86.98);
      expect(bruta.loja).toBe('Amazon (FRIOPECAS)');
    });

    it('calcula desconto Pix quando apenas o total parcelado está no seletor e o buybox indica 10% off', () => {
      const html = `
        <html>
          <body>
            <div id="centerCol">
              <div id="corePrice_feature_div">
                <span class="a-offscreen">R$ 2.303,15</span>
              </div>
              <div id="apex_desktop">
                <span>10% off à vista no Pix ou NuPay</span>
                <span>ou em até 12x de R$ 192,03 sem juros (total parcelado R$ 2.303,15)</span>
              </div>
            </div>
            <div id="merchant-info">Vendido por Leveros</div>
          </body>
        </html>
      `;
      const bruta = parsearAmazon(html, itemExemplo);
      expect(bruta.precoAVista).toBe(2072.84);
    });

    it('lança erro quando detecta captcha da Amazon', () => {
      const html = '<html><body><h4>sorry, we just need to make sure you\'re not a robot</h4></body></html>';
      expect(() => parsearAmazon(html, itemExemplo)).toThrow(/Captcha/);
    });

    it('lança erro quando não encontra seletor de preço', () => {
      const html = '<html><body><div>Produto Indisponível</div></body></html>';
      expect(() => parsearAmazon(html, itemExemplo)).toThrow(/seletor de preço não encontrado/);
    });
  });
});

