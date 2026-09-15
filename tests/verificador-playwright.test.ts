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
            innerText: async () => 'R$ 1.797,80',
          }),
          filter: () => ({
            first: () => ({
              innerText: async () => 'R$ 1.797,80',
            }),
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Comunidade (Promobit)',
        titulo: 'LG Dual Inverter Voice 9000 Só Frio',
        precoAVista: 1797.8,
        frete: 100,
        precoTotal: 1897.8,
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
            innerText: async () => 'R$ 1.850,00',
          }),
          filter: () => ({
            first: () => ({
              innerText: async () => 'R$ 1.850,00',
            }),
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Comunidade (Promobit)',
        titulo: 'LG Dual Inverter Voice 9000 Só Frio',
        precoAVista: 1850,
        frete: 100,
        precoTotal: 1950,
        url: 'https://www.promobit.com.br/oferta/teste-ativa',
        fonteId: 'promobit',
      };

      const resultado = await verificarPromobit(mockPage, oferta);
      expect(resultado.valida).toBe(true);
      expect(resultado.precoConfirmado).toBe(1850);
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
        loja: 'Amazon (Leveros)',
        titulo: 'LG Dual Inverter Voice 9000',
        precoAVista: 2072.83,
        frete: 86.98,
        precoTotal: 2159.81,
        url: 'https://www.amazon.com.br/dp/B0GQJP852H',
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
            innerText: async () => 'R$ 2.072,83',
          }),
        }),
      } as any;

      const oferta: Oferta = {
        loja: 'Amazon (FRIOPECAS)',
        titulo: 'LG Dual Inverter Voice 9000',
        precoAVista: 2139.0,
        frete: 86.98,
        precoTotal: 2225.98,
        url: 'https://www.amazon.com.br/dp/B0GQJP852H',
        fonteId: 'amazon',
      };

      const resultado = await verificarAmazon(mockPage, oferta);
      expect(resultado.valida).toBe(true);
      expect(resultado.precoConfirmado).toBe(2072.83);
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
        titulo: 'LG Dual Inverter Voice 9000',
        precoAVista: 2114.5,
        frete: 352.8,
        precoTotal: 2467.3,
        url: 'https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/',
        fonteId: 'lg',
      };

      const resultado = await verificarLg(mockPage, oferta);
      expect(resultado.valida).toBe(false);
      expect(resultado.motivo).toContain('esgotado');
    });
  });
});
