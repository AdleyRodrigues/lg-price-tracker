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
                      "offerTitle": "Notebook Gamer Acer Nitro V15 RTX 4060",
                      "offerPrice": 5100.0,
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
            <h1>Notebook Gamer Lenovo LOQ RTX 4060</h1>
            <button class="btn-disabled">Oferta encerrada</button>
            <div class="price">R$ 5.299,00</div>
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
                      "offerTitle": "Notebook Gamer Acer Nitro V15 RTX 4060",
                      "offerPrice": 5200.0,
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
    it('mapeia oferta ativa válida de notebook gamer corretamente', () => {
      const item: PromobitOffer = {
        offer_title: 'Notebook Gamer Acer Nitro V15 RTX 4060 16GB RAM 512GB SSD',
        offer_price: 5499.0,
        offer_slug: 'notebook-gamer-acer-nitro-v15-rtx-4060-3000000',
        offer_status_name: 'APPROVED',
        offer_cta: 'Ir à loja',
        offer_coupon: 'NITRO500',
      };
      const oferta = mapearJsonPromobit(item);
      expect(oferta).not.toBeNull();
      expect(oferta?.loja).toBe('Comunidade (Promobit)');
      expect(oferta?.precoAVista).toBe(5499.0);
      expect(oferta?.frete).toBe(100.0);
      expect(oferta?.precoTotal).toBe(5599.0);
      expect(oferta?.cupomTag).toBe('NITRO500');
      expect(oferta?.url).toContain('notebook-gamer-acer-nitro-v15-rtx-4060-3000000');
    });

    it('rejeita oferta com preço abaixo do piso (R$ 3.800)', () => {
      const item: PromobitOffer = {
        offer_title: 'Notebook Gamer RTX 4060',
        offer_price: 2500.0,
        offer_slug: 'slug-teste',
        offer_status_name: 'APPROVED',
      };
      expect(mapearJsonPromobit(item)).toBeNull();
    });

    it('rejeita oferta com GPU não alvo (ex: RTX 3050)', () => {
      const item: PromobitOffer = {
        offer_title: 'Notebook Gamer Lenovo LOQ RTX 3050 16GB',
        offer_price: 4200.0,
        offer_slug: 'slug-teste',
        offer_status_name: 'APPROVED',
      };
      expect(mapearJsonPromobit(item)).toBeNull();
    });
  });

  describe('varrerCardsPromobit', () => {
    it('ignora cards sem link de oferta ou com hardware bloqueado', () => {
      const html = `
        <html>
          <body>
            <article class="offer-card">
              <h3>Desktop PC Gamer RTX 4060</h3>
              <a href="/oferta/desktop-pc-gamer-1234">Ver</a>
              <span>R$ 4.500,00</span>
            </article>
          </body>
        </html>
      `;
      const ofertas = varrerCardsPromobit(html);
      expect(ofertas).toHaveLength(0);
    });

    it('extrai cards de notebook com RTX 4060', () => {
      const html = `
        <html>
          <body>
            <article class="offer-card">
              <h3>Notebook Gamer Acer Nitro V15 RTX 4060 16GB</h3>
              <a href="/oferta/notebook-acer-nitro-4060-5678">Ver</a>
              <span>R$ 5.299,00</span>
            </article>
          </body>
        </html>
      `;
      const ofertas = varrerCardsPromobit(html);
      expect(ofertas).toHaveLength(1);
      expect(ofertas[0].titulo).toContain('Acer Nitro');
      expect(ofertas[0].precoAVista).toBe(5299);
    });
  });
});
