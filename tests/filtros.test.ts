import { describe, expect, it } from 'vitest';
import {
  aceitarOferta,
  ofertaBrutaValida,
  ofertaEncerrada,
  precoAbaixoDoPiso,
  tituloBloqueado,
} from '../src/domain/filtros';
import { Oferta } from '../src/types/oferta';

describe('filtros domain', () => {
  describe('tituloBloqueado', () => {
    it('bloqueia desktops, pc gamer, placas de vídeo avulsas e GPUs', () => {
      expect(tituloBloqueado('PC Gamer Desktop Intel Core i5 16GB RTX 4060')).toBe(true);
      expect(tituloBloqueado('Desktop Gamer Lenovo RTX 4060')).toBe(true);
      expect(tituloBloqueado('Placa de Vídeo RTX 4060 8GB GDDR6')).toBe(true);
      expect(tituloBloqueado('GPU Gigabyte GeForce RTX 4060 Eagle')).toBe(true);
    });

    it('bloqueia periféricos e acessórios (mesa, suporte, cooler, gabinete, fonte, monitor, teclado)', () => {
      expect(tituloBloqueado('Mesa Gamer para Notebook RTX 4060')).toBe(true);
      expect(tituloBloqueado('Suporte Articulado para Notebook RTX 4060')).toBe(true);
      expect(tituloBloqueado('Cooler para Notebook Gamer RTX 4060')).toBe(true);
      expect(tituloBloqueado('Gabinete Gamer com Suporte para Laptop RTX 4060')).toBe(true);
      expect(tituloBloqueado('Fonte Carregador para Notebook Dell RTX 4060')).toBe(true);
      expect(tituloBloqueado('Monitor Gamer 144Hz para Notebook RTX 4060')).toBe(true);
      expect(tituloBloqueado('Teclado Mecânico RGB para Notebook RTX 4060')).toBe(true);
    });

    it('bloqueia produtos usados', () => {
      expect(tituloBloqueado('Notebook Gamer Acer Nitro 5 RTX 4060 Usado')).toBe(true);
    });

    it('bloqueia itens sem menção a notebook ou laptop', () => {
      expect(tituloBloqueado('Acer Nitro V15 RTX 4060 16GB SSD 512GB')).toBe(true);
    });

    it('bloqueia notebooks com outras GPUs (ex: 3050, 4050, 4070)', () => {
      expect(tituloBloqueado('Notebook Gamer Acer Nitro V15 RTX 3050')).toBe(true);
      expect(tituloBloqueado('Notebook Gamer Acer Nitro V15 RTX 4050')).toBe(true);
      expect(tituloBloqueado('Laptop Gamer ASUS ROG RTX 4070')).toBe(true);
    });

    it('aceita notebooks e laptops legítimos com RTX 4060 ou RTX 5050', () => {
      expect(
        tituloBloqueado(
          'Notebook Gamer Acer Nitro V15 ANV15-52-52VN Intel Core i5 16GB 512GB SSD RTX 4060'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Laptop Dell G15 5530 Intel Core i7 16GB 512GB SSD RTX 4060 15.6 FHD 165Hz'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Notebook Lenovo Gamer LOQ Essential Intel Core i7 16GB 512GB SSD RTX 5050 15.6"'
        )
      ).toBe(false);
      expect(
        tituloBloqueado(
          'Laptop ASUS Gamer V16 V3607VH RTX 5050 Core 5 16GB RAM 512GB SSD'
        )
      ).toBe(false);
    });

    it('bloqueia títulos vazios ou nulos', () => {
      expect(tituloBloqueado('')).toBe(true);
    });
  });

  describe('precoAbaixoDoPiso', () => {
    it('bloqueia preços menores que 3800 (piso mínimo para notebooks gamer)', () => {
      expect(precoAbaixoDoPiso(3799.99)).toBe(true);
      expect(precoAbaixoDoPiso(2500)).toBe(true);
      expect(precoAbaixoDoPiso(800)).toBe(true);
      expect(precoAbaixoDoPiso(0)).toBe(true);
      expect(precoAbaixoDoPiso(-50)).toBe(true);
    });

    it('bloqueia NaN e Infinity', () => {
      expect(precoAbaixoDoPiso(Number.NaN)).toBe(true);
      expect(precoAbaixoDoPiso(Number.POSITIVE_INFINITY)).toBe(true);
    });

    it('aceita preços iguais ou superiores a 3800', () => {
      expect(precoAbaixoDoPiso(3800)).toBe(false);
      expect(precoAbaixoDoPiso(4899.9)).toBe(false);
      expect(precoAbaixoDoPiso(6137.0)).toBe(false);
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
    it('valida oferta correta de notebook gamer', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer Acer Nitro V15 RTX 4060 16GB SSD 512GB',
          5499.0,
          'APPROVED'
        )
      ).toBe(true);
    });

    it('rejeita se título for bloqueado', () => {
      expect(
        ofertaBrutaValida(
          'Placa de Vídeo RTX 4060 8GB GDDR6',
          4200.0,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se preço estiver abaixo do piso', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer Acer Nitro RTX 4060',
          1800.0,
          'APPROVED'
        )
      ).toBe(false);
    });

    it('rejeita se status indicar encerrada', () => {
      expect(
        ofertaBrutaValida(
          'Notebook Gamer Lenovo LOQ RTX 4060',
          4999.0,
          'Oferta encerrada'
        )
      ).toBe(false);
    });
  });

  describe('aceitarOferta', () => {
    it('aceita oferta completa e válida', () => {
      const oferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer Acer Nitro V15 ANV15-52-52VN RTX 4060',
        precoAVista: 5200.0,
        frete: 0,
        precoTotal: 5200.0,
        url: 'https://www.amazon.com.br/dp/B0FY41RGG9',
      };
      expect(aceitarOferta(oferta)).toBe(true);
    });

    it('rejeita oferta com frete negativo ou inválido', () => {
      const ofertaInvalida: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer Acer Nitro RTX 4060',
        precoAVista: 5200.0,
        frete: -10,
        precoTotal: 5190.0,
        url: 'https://example.com',
      };
      expect(aceitarOferta(ofertaInvalida)).toBe(false);
    });
  });
});
