import { describe, expect, it } from 'vitest';
import {
  aceitarOferta,
  ofertaBrutaValida,
  ofertaEncerrada,
  precoAbaixoDoPiso,
  tituloBloqueado,
} from '../src/domain/filtros';
import { Oferta } from '../types/oferta';

describe('filtros domain', () => {
  describe('tituloBloqueado', () => {
    it('bloqueia modelos Smart Inverter (rotor simples: S3-Q09JA, JA31, JA33)', () => {
      expect(
        tituloBloqueado('Ar Condicionado Split LG AI Smart Inverter Voice 9000 BTUs Frio 220V S3-Q09JA31E')
      ).toBe(true);
      expect(
        tituloBloqueado('Ar Condicionado LG Smart Inverter 9000 Frio 220V')
      ).toBe(true);
      expect(
        tituloBloqueado('LG Voice 9000 Só Frio', 'S3-Q09JA31E')
      ).toBe(true);
    });

    it('bloqueia modelos de 127V ou 110V', () => {
      expect(
        tituloBloqueado('Ar-Condicionado Split HW LG Dual Inverter +AI Voice 9.000 BTUs R-32 Só Frio 127V')
      ).toBe(true);
      expect(
        tituloBloqueado('LG Dual Inverter 9000 110V')
      ).toBe(true);
    });

    it('bloqueia peças avulsas (evaporadora S4NQ, condensadora S4UQ)', () => {
      expect(tituloBloqueado('Condensadora LG Dual Inverter 9000')).toBe(true);
      expect(tituloBloqueado('Evaporadora LG Voice 9000')).toBe(true);
      expect(tituloBloqueado('Unidade Externa S4UQ09AA31C')).toBe(true);
      expect(tituloBloqueado('Unidade Interna S4NQ09AA31C')).toBe(true);
      expect(tituloBloqueado('LG Dual Inverter 9000', 'S4UQ09AA31C')).toBe(true);
    });

    it('bloqueia modelos de outras capacidades (12k, 18k, 24k)', () => {
      expect(
        tituloBloqueado('Ar Condicionado LG Dual Inverter Voice 12000 BTU Frio')
      ).toBe(true);
      expect(
        tituloBloqueado('Ar Condicionado LG Dual Voice 18.000 Btus')
      ).toBe(true);
      expect(
        tituloBloqueado('Ar Condicionado LG Dual Voice 24.000 Btus')
      ).toBe(true);
    });

    it('bloqueia modelos Quente e Frio (S3-W)', () => {
      expect(
        tituloBloqueado(
          'Ar Condicionado Hi Wall LG Dual Inverter Voice AI 9.000 Btus Quente e Frio 220v'
        )
      ).toBe(true);
      expect(
        tituloBloqueado('LG Dual Inverter 9000', 'S3-W09AA31A')
      ).toBe(true);
    });

    it('rejeita modelos sem menção a Dual Inverter ou sem SKU compatível', () => {
      expect(
        tituloBloqueado('Ar Condicionado Split 9000 BTU Frio 220V')
      ).toBe(true);
    });

    it('aceita modelos legítimos de 9.000 BTU Só Frio 220V Dual Inverter', () => {
      expect(
        tituloBloqueado(
          'Ar-Condicionado LG Dual Inverter AI Voice 9.000 BTU Frio 220V'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'LG Ar Condicionado Split LG Dual Inverter AI Voice 9000 BTU/h Frio S3-Q09AA31F - 220 Volts'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Ar Condicionado LG AI Dual Inverter Voice 9.000 BTUS Frio 220V S3-Q09AA31C'
        )
      ).toBe(false);
      expect(
        tituloBloqueado('LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F', 'S3-Q09AA33F')
      ).toBe(false);
    });

    it('bloqueia títulos vazios ou nulos', () => {
      expect(tituloBloqueado('')).toBe(true);
    });
  });

  describe('precoAbaixoDoPiso', () => {
    it('bloqueia preços menores que 1500 (preço mínimo)', () => {
      expect(precoAbaixoDoPiso(1499.99)).toBe(true);
      expect(precoAbaixoDoPiso(800)).toBe(true);
      expect(precoAbaixoDoPiso(0)).toBe(true);
      expect(precoAbaixoDoPiso(-50)).toBe(true);
    });

    it('bloqueia NaN e Infinity', () => {
      expect(precoAbaixoDoPiso(Number.NaN)).toBe(true);
      expect(precoAbaixoDoPiso(Number.POSITIVE_INFINITY)).toBe(true);
    });

    it('aceita preços iguais ou superiores a 1500', () => {
      expect(precoAbaixoDoPiso(1500)).toBe(false);
      expect(precoAbaixoDoPiso(2072.83)).toBe(false);
      expect(precoAbaixoDoPiso(2114.5)).toBe(false);
    });
  });

  describe('ofertaEncerrada', () => {
    it('detecta palavras-chave de encerramento', () => {
      expect(ofertaEncerrada('Oferta encerrada')).toBe(true);
      expect(ofertaEncerrada('Promoção expirada')).toBe(true);
      expect(ofertaEncerrada('Produto esgotado')).toBe(true);
      expect(ofertaEncerrada('Status: FINISHED')).toBe(true);
      expect(ofertaEncerrada('Status: CLOSED')).toBe(true);
      expect(ofertaEncerrada('Item inativo')).toBe(true);
      expect(ofertaEncerrada('Produto indisponível na região')).toBe(true);
    });

    it('retorna false para ofertas ativas', () => {
      expect(ofertaEncerrada('APPROVED')).toBe(false);
      expect(ofertaEncerrada('Em estoque')).toBe(false);
      expect(ofertaEncerrada('Ir à loja')).toBe(false);
      expect(ofertaEncerrada('')).toBe(false);
    });
  });

  describe('ofertaBrutaValida', () => {
    it('valida oferta correta', () => {
      expect(
        ofertaBrutaValida(
          'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
          2072.83,
          'APPROVED'
        )
      ).toBe(true);
    });

    it('rejeita se título for bloqueado', () => {
      expect(
        ofertaBrutaValida(
          'LG Dual Inverter 12000 BTU',
          2072.83,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se preço estiver abaixo do piso', () => {
      expect(
        ofertaBrutaValida(
          'LG Dual Inverter Voice 9000 Só Frio',
          450.0,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se status indicar encerrada', () => {
      expect(
        ofertaBrutaValida(
          'LG Dual Inverter Voice 9000 Só Frio',
          1800.0,
          'Oferta encerrada'
        )
      ).toBe(false);
    });
  });

  describe('aceitarOferta', () => {
    it('aceita oferta completa e válida', () => {
      const oferta: Oferta = {
        loja: 'Amazon (Leveros)',
        titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
        precoAVista: 2072.83,
        frete: 86.98,
        precoTotal: 2159.81,
        url: 'https://www.amazon.com.br/dp/B0GQJP852H',
      };
      expect(aceitarOferta(oferta)).toBe(true);
    });

    it('rejeita oferta com frete negativo ou inválido', () => {
      const ofertaInvalida: Oferta = {
        loja: 'Amazon',
        titulo: 'LG Dual Inverter Voice 9000 Só Frio',
        precoAVista: 2072.83,
        frete: -10,
        precoTotal: 2062.83,
        url: 'https://example.com',
      };
      expect(aceitarOferta(ofertaInvalida)).toBe(false);
    });
  });
});
