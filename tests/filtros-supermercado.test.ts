import { describe, expect, it } from 'vitest';
import {
  classificarCategoria,
  filtrarPromocoesMuitoBoas,
  precoAbaixoMinimo,
  produtoBloqueado,
  tituloEhGenuino,
} from '../src/domain/filtros-supermercado';
import { OfertaSupermercado } from '../src/types/supermercado';

describe('filtros supermercado domain', () => {
  describe('classificarCategoria', () => {
    it('classifica itens de limpeza', () => {
      expect(classificarCategoria('Sabão Líquido Ariel 3L')).toBe('Limpeza');
      expect(classificarCategoria('Detergente Ypê 500ml')).toBe('Limpeza');
      expect(classificarCategoria('Amaciante Comfort 2L')).toBe('Limpeza');
    });

    it('classifica itens de alimentos e bebidas', () => {
      expect(classificarCategoria('Café Torrado e Moído Pilão 500g')).toBe('Alimentos & Bebidas');
      expect(classificarCategoria('Azeite de Oliva Extra Virgem 500ml')).toBe('Alimentos & Bebidas');
      expect(classificarCategoria('Chocolate Nestlé 90g')).toBe('Alimentos & Bebidas');
    });

    it('classifica itens de higiene pessoal', () => {
      expect(classificarCategoria('Shampoo Head & Shoulders 400ml')).toBe('Higiene Pessoal');
      expect(classificarCategoria('Creme Dental Colgate Total 12 90g')).toBe('Higiene Pessoal');
      expect(classificarCategoria('Desodorante Rexona 150ml')).toBe('Higiene Pessoal');
    });

    it('retorna Outros para produtos fora das 3 categorias foco', () => {
      expect(classificarCategoria('Smartphone Samsung Galaxy S23')).toBe('Outros');
      expect(classificarCategoria('Pneu Aro 14')).toBe('Outros');
    });
  });

  describe('filtrarPromocoesMuitoBoas', () => {
    it('filtra ofertas com pelo menos 35% de desconto e categorizadas', () => {
      const ofertas: OfertaSupermercado[] = [
        {
          titulo: 'Sabão Líquido Omo Lavagem Perfeita 3L',
          precoAtual: 39.9,
          precoOriginal: 69.9,
          descontoPercentual: 42,
          url: 'https://mercadolivre.com.br/item1',
        },
        {
          titulo: 'Detergente Ypê 500ml',
          precoAtual: 2.5,
          descontoPercentual: 20, // menor que 35%
          url: 'https://mercadolivre.com.br/item2',
        },
        {
          titulo: 'Smartphone Moto G',
          precoAtual: 900,
          descontoPercentual: 40,
          url: 'https://mercadolivre.com.br/item3',
        },
      ];

      const filtradas = filtrarPromocoesMuitoBoas(ofertas);
      expect(filtradas).toHaveLength(1);
      expect(filtradas[0].titulo).toContain('Sabão Líquido Omo');
      expect(filtradas[0].categoria).toBe('Limpeza');
    });
  });
});
