import { describe, expect, it } from 'vitest';
import {
  verificarPromobit,
  verificarAmazon,
  verificarLg,
  validarTopOfertasComPlaywright,
} from '../src/services/verificador-playwright';
import { Oferta } from '../src/types/oferta';

describe('verificador frontend com Playwright', () => {
  describe('verificarPromobit', () => {
    it('rejeita oferta quando botão "Oferta encerrada" está visível', async () => {
      const mockPage = {
        goto: async () => {},
        locator: (seletor: string) => ({
          first: () => ({
            isVisible: async () => seletor.includes('Oferta encerrada'),
            innerText: async () => 'R$ 5.100,00',
          }),
          filter: () => ({
            first: () => ({
              innerText: async () => 'R$ 5.100,00',
            }),
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Comunidade (Promobit)',
        titulo: 'Notebook Gamer Acer Nitro V15 RTX 4060',
        precoAVista: 5100.0,
        frete: 100,
        precoTotal: 5200.0,
        url: 'https://www.promobit.com.br/oferta/teste-123',
        fonteId: 'promobit',
      };

      const resultado = await verificarPromobit(mockPage, oferta);
      expect(resultado.valida).toBe(false);
      expect(resultado.motivo).toContain('Oferta encerrada');
    });

    it('aprova oferta ativa com botão "Ir para a loja" e confirma preço', async () => {
      const mockPage = {
        goto: async () => {},
        locator: (seletor: string) => ({
          first: () => ({
            isVisible: async () => seletor.includes('Ir para a loja'),
            innerText: async () => 'R$ 5.200,00',
          }),
          filter: () => ({
            first: () => ({
              innerText: async () => 'R$ 5.200,00',
            }),
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Comunidade (Promobit)',
        titulo: 'Notebook Gamer Acer Nitro V15 RTX 4060',
        precoAVista: 5200,
        frete: 100,
        precoTotal: 5300,
        url: 'https://www.promobit.com.br/oferta/teste-ativa',
        fonteId: 'promobit',
      };

      const resultado = await verificarPromobit(mockPage, oferta);
      expect(resultado.valida).toBe(true);
      expect(resultado.precoConfirmado).toBe(5200);
    });
  });

  describe('verificarAmazon', () => {
    it('rejeita produto indisponível na Amazon', async () => {
      const mockPage = {
        goto: async () => {},
        locator: (seletor: string) => ({
          first: () => ({
            isVisible: async () => seletor.includes('indisponível') || seletor.includes('Não disponível'),
            innerText: async () => '',
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer Acer Nitro V15 RTX 4060',
        precoAVista: 5200.0,
        frete: 0,
        precoTotal: 5200.0,
        url: 'https://www.amazon.com.br/dp/B0FY41RGG9',
        fonteId: 'amazon',
      };

      const resultado = await verificarAmazon(mockPage, oferta);
      expect(resultado.valida).toBe(false);
      expect(resultado.motivo).toContain('indisponível');
    });

    it('aprova e confirma preço atualizado na Amazon', async () => {
      const mockPage = {
        goto: async () => {},
        locator: (seletor: string) => ({
          first: () => ({
            isVisible: async () => false,
            innerText: async () => 'R$ 5.299,00',
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer Acer Nitro V15 RTX 4060',
        precoAVista: 5499.0,
        frete: 0,
        precoTotal: 5499.0,
        url: 'https://www.amazon.com.br/dp/B0FY41RGG9',
        fonteId: 'amazon',
      };

      const resultado = await verificarAmazon(mockPage, oferta);
      expect(resultado.valida).toBe(true);
      expect(resultado.precoConfirmado).toBe(5299.0);
    });
  });

  describe('verificarLg', () => {
    it('rejeita produto esgotado na loja oficial', async () => {
      const mockPage = {
        goto: async () => {},
        locator: (seletor: string) => ({
          first: () => ({
            isVisible: async () => seletor.includes('esgotado') || seletor.includes('indisponível'),
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Loja Oficial LG',
        titulo: 'Notebook Gamer LG Gram RTX 4060',
        precoAVista: 6000.0,
        frete: 0,
        precoTotal: 6000.0,
        url: 'https://www.lg.com/br/notebooks/rtx4060/',
        fonteId: 'lg',
      };

      const resultado = await verificarLg(mockPage, oferta);
      expect(resultado.valida).toBe(false);
      expect(resultado.motivo).toContain('esgotado');
    });
  });
});
