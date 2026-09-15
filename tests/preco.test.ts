import { describe, expect, it } from 'vitest';
import { extrairPreco, formatBRL } from '../src/lib/preco';

describe('preco lib', () => {
  describe('formatBRL', () => {
    it('formata valores numéricos para padrão monetário brasileiro', () => {
      const formatado = formatBRL(2072.83);
      expect(formatado).toContain('2.072,83');
      expect(formatado).toContain('R$');
    });

    it('formata valor zero corretamente', () => {
      const formatado = formatBRL(0);
      expect(formatado).toContain('0,00');
    });
  });

  describe('extrairPreco', () => {
    it('extrai preço de string com R$, ponto de milhar e vírgula decimal', () => {
      expect(extrairPreco('R$ 2.072,83')).toBe(2072.83);
      expect(extrairPreco('R$ 1.797,80')).toBe(1797.8);
      expect(extrairPreco('R$ 352,80')).toBe(352.8);
      expect(extrairPreco('R$ 86,98')).toBe(86.98);
    });

    it('extrai preço sem símbolo R$', () => {
      expect(extrairPreco('2.114,50')).toBe(2114.5);
      expect(extrairPreco('1500,00')).toBe(1500);
    });

    it('retorna NaN para textos sem números válidos', () => {
      expect(Number.isNaN(extrairPreco(''))).toBe(true);
      expect(Number.isNaN(extrairPreco('Indisponível'))).toBe(true);
      expect(Number.isNaN(extrairPreco('Frete grátis'))).toBe(true);
    });
  });
});
