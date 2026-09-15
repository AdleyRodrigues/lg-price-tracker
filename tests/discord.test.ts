import { describe, expect, it } from 'vitest';
import {
  corDoVencedor,
  formatarItemField,
  gerarRankingTexto,
  montarPayloadDiscord,
} from '../src/services/discord';
import { Oferta } from '../src/types/oferta';

describe('discord service', () => {
  const ofertas: Oferta[] = [
    {
      loja: 'Amazon (Leveros)',
      titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
      precoAVista: 2072.83,
      frete: 86.98,
      precoTotal: 2159.81,
      url: 'https://www.amazon.com.br/dp/B0GQJP852H',
    },
    {
      loja: 'Loja Oficial LG',
      titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
      precoAVista: 2114.5,
      frete: 352.8,
      precoTotal: 2467.3,
      url: 'https://www.lg.com/br/s3-q09aa33f/',
    },
    {
      loja: 'Comunidade (Promobit)',
      titulo: 'LG Dual Inverter Voice 9000',
      precoAVista: 1800.0,
      frete: 100.0,
      precoTotal: 1900.0,
      url: 'https://www.promobit.com.br/oferta/teste',
      cupomTag: 'PROMO10',
    },
  ];

  describe('corDoVencedor', () => {
    it('retorna cor da Amazon para Amazon', () => {
      expect(corDoVencedor('Amazon (Leveros)')).toBe(0xff9900);
    });

    it('retorna cor da LG para Loja Oficial LG', () => {
      expect(corDoVencedor('Loja Oficial LG')).toBe(0xa50034);
    });

    it('retorna cor do Promobit para Comunidade', () => {
      expect(corDoVencedor('Comunidade (Promobit)')).toBe(0xe67e22);
    });
  });

  describe('formatarItemField', () => {
    it('formata campo individual com medalha, valores discriminados e link', () => {
      const field = formatarItemField(ofertas[0], 0);
      expect(field.name).toBe('🥇 1º — Amazon (Leveros)');
      expect(field.value).toContain('LG Dual Inverter Voice 9000');
      expect(field.value).toContain('À vista R$');
      expect(field.value).toContain('frete R$ 86,98');
      expect(field.value).toContain('**Total: R$ 2.159,81**');
      expect(field.value).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0GQJP852H)');
    });
  });

  describe('gerarRankingTexto', () => {
    it('formata cada posição com medalha, valores discriminados e link', () => {
      const texto = gerarRankingTexto(ofertas);
      expect(texto).toContain('🥇 1º — Amazon (Leveros)');
      expect(texto).toContain('À vista');
      expect(texto).toContain('frete R$');
      expect(texto).toContain('**Total: R$');
      expect(texto).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0GQJP852H)');
      expect(texto).toContain('Cupom: `PROMO10`');
    });
  });

  describe('montarPayloadDiscord', () => {
    it('cria estrutura sem menção direta ao usuário quando preço está acima do threshold', () => {
      const payload = montarPayloadDiscord(ofertas, '123456789', '60440-240');
      expect(payload).not.toBeNull();
      expect(payload?.content).not.toContain('<@123456789>');
      expect(payload?.content).toContain('Pódio atualizado (Top 3)');
      expect(payload?.embeds[0].title).toContain('Amazon (Leveros)');
      expect(payload?.embeds[0].title).toContain('2.159,81');
      expect(payload?.embeds[0].description).toContain('60440-240');
      expect(payload?.embeds[0].fields).toHaveLength(3);
      expect(payload?.embeds[0].fields[0].name).toBe('🥇 1º — Amazon (Leveros)');
      expect(payload?.embeds[0].footer.text).toContain('60440-240');
    });

    it('dispara menção com ping sonoro quando o menor preço rompe o piso histórico (<= R$ 1.850)', () => {
      const superOferta: Oferta = {
        loja: 'Amazon (Super Promo)',
        titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
        precoAVista: 1750.0,
        frete: 80.0,
        precoTotal: 1830.0,
        url: 'https://www.amazon.com.br/dp/B0GQJP852H',
      };
      const payload = montarPayloadDiscord([superOferta, ...ofertas], '123456789', '60440-240');
      expect(payload).not.toBeNull();
      expect(payload?.content).toContain('<@123456789>');
      expect(payload?.content).toContain('OPORTUNIDADE ABAIXO DE');
      expect(payload?.embeds[0].title).toContain('1.830,00');
    });

    it('retorna null se lista de ofertas for vazia', () => {
      expect(montarPayloadDiscord([])).toBeNull();
    });
  });
});
