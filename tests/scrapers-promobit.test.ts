import { describe, expect, it } from 'vitest';
import {
  mapearJsonPromobit,
  montarOfertaComunidade,
  PromobitOffer,
  varrerCardsPromobit,
  verificarHtmlPromobitEncerrado,
} from '../src/scrapers/promobit';

describe('promobit scraper', () => {
  describe('verificarHtmlPromobitEncerrado', () => {
    it('detecta encerramento via __NEXT_DATA__ (serverOffer.offerStatusName === FINISHED)', () => {
      const html = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "serverOffer": {
                      "offerId": 2998517,
                      "offerTitle": "Ar Condicionado Split LG Voice 9000",
                      "offerPrice": 1797.8,
                      "offerStatus": 5,
                      "offerStatusName": "FINISHED",
                      "offerCta": null
                    }
                  }
                }
              }
            </script>
          </body>
        </html>
      `;
      expect(verificarHtmlPromobitEncerrado(html)).toBe(true);
    });

    it('detecta encerramento via botão "Oferta encerrada" no HTML', () => {
      const html = `
        <html>
          <body>
            <h1>Ar Condicionado Split Hi Wall Inverter LG Dual Voice AI 9.000 Btus Frio 220V R32</h1>
            <button class="btn-disabled">Oferta encerrada</button>
            <div class="price">R$ 1.797,80</div>
          </body>
        </html>
      `;
      expect(verificarHtmlPromobitEncerrado(html)).toBe(true);
    });

    it('retorna false para promoção ativa e válida', () => {
      const html = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              {
                "props": {
                  "pageProps": {
                    "serverOffer": {
                      "offerId": 3000000,
                      "offerTitle": "Ar Condicionado Split LG Voice 9000",
                      "offerPrice": 1850.0,
                      "offerStatus": 1,
                      "offerStatusName": "ACTIVE",
                      "offerCta": "Ir à loja"
                    }
                  }
                }
              }
            </script>
            <button>Ir à loja</button>
          </body>
        </html>
      `;
      expect(verificarHtmlPromobitEncerrado(html)).toBe(false);
    });
  });

  describe('mapearJsonPromobit', () => {
    it('mapeia oferta ativa válida corretamente', () => {
      const item: PromobitOffer = {
        offer_title: 'Ar Condicionado LG Dual Inverter Voice 9000 Frio',
        offer_price: 1850.0,
        offer_slug: 'ar-condicionado-lg-dual-inverter-voice-9000-frio-3000000',
        offer_status_name: 'APPROVED',
        offer_cta: 'Ir à loja',
        offer_coupon: 'LGPROMO',
      };
      const oferta = mapearJsonPromobit(item);
      expect(oferta).not.toBeNull();
      expect(oferta?.loja).toBe('Comunidade (Promobit)');
      expect(oferta?.precoAVista).toBe(1850.0);
      expect(oferta?.frete).toBe(100.0);
      expect(oferta?.precoTotal).toBe(1950.0);
      expect(oferta?.cupomTag).toBe('LGPROMO');
      expect(oferta?.url).toContain('ar-condicionado-lg-dual-inverter-voice-9000-frio-3000000');
    });

    it('rejeita oferta com preço abaixo do piso', () => {
      const item: PromobitOffer = {
        offer_title: 'Ar Condicionado LG Dual Inverter 9000',
        offer_price: 500.0,
        offer_slug: 'slug-teste',
        offer_status_name: 'APPROVED',
      };
      expect(mapearJsonPromobit(item)).toBeNull();
    });

    it('rejeita oferta de modelo de 12.000 BTU', () => {
      const item: PromobitOffer = {
        offer_title: 'Ar Condicionado LG Dual Inverter 12000 BTU Frio',
        offer_price: 2200.0,
        offer_slug: 'slug-teste',
        offer_status_name: 'APPROVED',
      };
      expect(mapearJsonPromobit(item)).toBeNull();
    });
  });

  describe('varrerCardsPromobit', () => {
    it('ignora cards sem link de oferta ou com modelos bloqueados', () => {
      const html = `
        <html>
          <body>
            <article class="offer-card">
              <h3>Ar Condicionado LG Dual Inverter 12.000 Btus</h3>
              <a href="/oferta/ar-condicionado-12000-1234">Ver</a>
              <span>R$ 2.300,00</span>
            </article>
          </body>
        </html>
      `;
      const ofertas = varrerCardsPromobit(html);
      expect(ofertas).toHaveLength(0);
    });
  });
});
