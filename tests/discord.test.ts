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
      loja: 'Amazon',
      titulo: 'Notebook Gamer Acer Nitro V15 ANV15-52-52VN RTX 4060 16GB',
      precoAVista: 5200.0,
      frete: 0,
      precoTotal: 5200.0,
      url: 'https://www.amazon.com.br/dp/B0FY41RGG9',
    },
    {
      loja: 'Comunidade (Promobit)',
      titulo: 'Notebook Lenovo Gamer LOQ Essential RTX 5050 16GB 512GB SSD',
      precoAVista: 5499.0,
      frete: 100.0,
      precoTotal: 5599.0,
      url: 'https://www.promobit.com.br/oferta/lenovo-loq-rtx-5050',
      cupomTag: 'NOTEBOOK10',
    },
    {
      loja: 'Amazon (Dell Oficial)',
      titulo: 'Laptop Dell G15 5530 Intel Core i7 16GB 512GB SSD RTX 4060',
      precoAVista: 5800.0,
      frete: 0,
      precoTotal: 5800.0,
      url: 'https://www.amazon.com.br/dp/B0DELLG15',
    },
  ];

  describe('corDoVencedor', () => {
    it('retorna cor da Amazon para Amazon', () => {
      expect(corDoVencedor('Amazon')).toBe(0xff9900);
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
      expect(field.name).toBe('🥇 1º — Amazon');
      expect(field.value).toContain('Notebook Gamer Acer Nitro V15');
      expect(field.value).toContain('À vista R$');
      expect(field.value).toContain('frete grátis');
      expect(field.value).toContain('**Total: R$ 5.200,00**');
      expect(field.value).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0FY41RGG9)');
    });
  });

  describe('gerarRankingTexto', () => {
    it('formata cada posição com medalha, valores discriminados e link', () => {
      const texto = gerarRankingTexto(ofertas);
      expect(texto).toContain('🥇 1º — Amazon');
      expect(texto).toContain('À vista');
      expect(texto).toContain('**Total: R$');
      expect(texto).toContain('[Ver oferta](https://www.amazon.com.br/dp/B0FY41RGG9)');
      expect(texto).toContain('Cupom: `NOTEBOOK10`');
    });
  });

  describe('montarPayloadDiscord', () => {
    it('cria estrutura com título "💻 Monitor de Notebooks Gamer (RTX 4060 / 5050)"', () => {
      const payload = montarPayloadDiscord(ofertas, '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).not.toContain('<@123456789>');
      expect(payload?.content).toContain('Pódio atualizado (Top 3)');
      expect(payload?.embeds[0].title).toBe('💻 Monitor de Notebooks Gamer (RTX 4060 / 5050)');
      expect(payload?.embeds[0].description).toContain('01001-000');
      expect(payload?.embeds[0].fields).toHaveLength(3);
      expect(payload?.embeds[0].fields[0].name).toBe('🥇 1º — Amazon');
      expect(payload?.embeds[0].footer.text).toContain('01001-000');
    });

    it('dispara menção com ping sonoro quando o menor preço rompe o piso de alerta crítico', () => {
      const superOferta: Oferta = {
        loja: 'Amazon',
        titulo: 'Notebook Gamer Acer Nitro V15 RTX 4060',
        precoAVista: 4200.0,
        frete: 0,
        precoTotal: 4200.0,
        url: 'https://www.amazon.com.br/dp/B0FY41RGG9',
      };
      const payload = montarPayloadDiscord([superOferta, ...ofertas], '123456789', '01001-000');
      expect(payload).not.toBeNull();
      expect(payload?.content).toContain('<@123456789>');
      expect(payload?.content).toContain('OPORTUNIDADE ABAIXO DE');
      expect(payload?.embeds[0].title).toBe('💻 Monitor de Notebooks Gamer (RTX 4060 / 5050)');
    });

    it('retorna null se lista de ofertas for vazia', () => {
      expect(montarPayloadDiscord([])).toBeNull();
    });
  });
});
