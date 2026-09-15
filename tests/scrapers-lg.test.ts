import { describe, expect, it } from 'vitest';
import { ItemCatalogo } from '../src/config/catalogo';
import {
  extrairSkuLg,
  parsearLg,
  parsearPrecoPixNoHtml,
} from '../src/scrapers/lg';

describe('lg scraper', () => {
  const itemLg: ItemCatalogo = {
    loja: 'Loja Oficial LG',
    produto: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
    sku: 'S3-Q09AA33F',
    url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
    parser: 'lg',
    freteFallback: 352.8,
  };

  describe('extrairSkuLg', () => {
    it('extrai SKU a partir de script javascript no HTML', () => {
      const html1 = '<script>const sku = "S3-Q09AA33F.EB2GAM1.ESSP.BR";</script>';
      expect(extrairSkuLg(html1)).toBe('S3-Q09AA33F.EB2GAM1.ESSP.BR');

      const html2 = '<div>"sku": `S3-Q09AA31F`</div>';
      expect(extrairSkuLg(html2)).toBe('S3-Q09AA31F');
    });

    it('retorna null quando não há SKU', () => {
      expect(extrairSkuLg('<html><body>Sem sku</body></html>')).toBeNull();
    });
  });

  describe('parsearPrecoPixNoHtml', () => {
    it('extrai preço Pix a partir de texto no HTML', () => {
      const html = '<div>Preço à vista no Pix: R$ 2.114,50 com 10% de desconto</div>';
      const parsed = parsearPrecoPixNoHtml(html);
      expect(parsed).not.toBeNull();
      expect(parsed?.valor).toBe(2114.5);
    });
  });

  describe('parsearLg', () => {
    it('usa frete de fallback (352.80) quando HTML estático não tem frete calculado', async () => {
      const html = `
        <html>
          <body>
            <div>Preço no Pix: R$ 2.114,50</div>
          </body>
        </html>
      `;
      const bruta = await parsearLg(html, itemLg);
      expect(bruta.precoAVista).toBe(2114.5);
      expect(bruta.frete).toBe(352.8);
      expect(bruta.loja).toBe('Loja Oficial LG');
    });

    it('extrai frete explícito quando presente no HTML', async () => {
      const html = `
        <html>
          <body>
            <div>Preço no Pix: R$ 2.114,50</div>
            <div class="delivery-box">Entrega Padrão R$ 352,80</div>
          </body>
        </html>
      `;
      const bruta = await parsearLg(html, itemLg);
      expect(bruta.precoAVista).toBe(2114.5);
      expect(bruta.frete).toBe(352.8);
    });
  });
});
