import { describe, expect, it } from 'vitest';
import { ordenarPorTotal, podio } from '../src/domain/ranking';
import { Oferta } from '../src/types/oferta';

describe('ranking domain', () => {
  const ofertas: Oferta[] = [
    {
      loja: 'Loja Oficial LG',
      titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA33F',
      precoAVista: 2114.5,
      frete: 352.8,
      precoTotal: 2467.3,
      url: 'https://www.lg.com/br/s3-q09aa33f/',
    },
    {
      loja: 'Amazon (Leveros)',
      titulo: 'LG Dual Inverter Voice 9000 Só Frio S3-Q09AA31F',
      precoAVista: 2072.83,
      frete: 86.98,
      precoTotal: 2159.81,
      url: 'https://www.amazon.com.br/dp/B0GQJP852H',
    },
    {
      loja: 'Loja Oficial LG (S3-Q09AA31A)',
      titulo: 'LG Dual Inverter Voice 9000 S3-Q09AA31A',
      precoAVista: 2554.24,
      frete: 352.8,
      precoTotal: 2907.04,
      url: 'https://www.lg.com/br/s3-q09aa31a-1/',
    },
  ];

  it('ordena ofertas pelo menor custo total (à vista + frete)', () => {
    const ordenadas = ordenarPorTotal(ofertas);
    expect(ordenadas[0].loja).toBe('Amazon (Leveros)');
    expect(ordenadas[0].precoTotal).toBe(2159.81);

    expect(ordenadas[1].loja).toBe('Loja Oficial LG');
    expect(ordenadas[1].precoTotal).toBe(2467.3);

    expect(ordenadas[2].loja).toBe('Loja Oficial LG (S3-Q09AA31A)');
    expect(ordenadas[2].precoTotal).toBe(2907.04);
  });

  it('extrai os primeiros lugares no pódio conforme tamanho solicitado', () => {
    const cincoOfertas: Oferta[] = [
      ...ofertas,
      {
        loja: 'Amazon 4',
        titulo: 'LG 4',
        precoAVista: 2600,
        frete: 80,
        precoTotal: 2680,
        url: 'https://example.com/4',
      },
      {
        loja: 'Amazon 5',
        titulo: 'LG 5',
        precoAVista: 2700,
        frete: 80,
        precoTotal: 2780,
        url: 'https://example.com/5',
      },
      {
        loja: 'Amazon 6',
        titulo: 'LG 6',
        precoAVista: 3000,
        frete: 80,
        precoTotal: 3080,
        url: 'https://example.com/6',
      },
    ];

    const ordenadas = ordenarPorTotal(cincoOfertas);
    const top5 = podio(ordenadas, 5);
    expect(top5).toHaveLength(5);
    expect(top5[0].loja).toBe('Amazon (Leveros)');
    expect(top5[4].loja).toBe('Loja Oficial LG (S3-Q09AA31A)');

    const padrao = podio(cincoOfertas);
    expect(padrao).toHaveLength(5);
  });
});
