# Notebook Gamer Price Tracker (RTX 4060 / RTX 5050)

Bot em **Node.js + TypeScript** que compara o preço de **Notebooks Gamer** equipados com GPUs NVIDIA GeForce **RTX 4060** e **RTX 5050** (à vista + frete) e envia alertas formatados no **Discord**.

Roda na sua máquina ou sozinho na nuvem, a cada 4 horas, via GitHub Actions.

---

## 💻 O que ele faz

1. **Coleta em paralelo**: Varrer vitrines e APIs de ofertas da **Amazon Brasil** e da Comunidade **Promobit**.
2. **Higienização e Filtros de Hardware**:
   - Descarta desktops, placas de vídeo avulsas, periféricos, usados e modelos com outras GPUs.
   - Aplica corte mínimo de segurança (**R$ 3.800,00**) para ignorar acessórios.
   - Exige obrigatoriamente `('notebook' OU 'laptop')` **E** `('4060' OU '5050')`.
3. **Validação Frontend com Playwright**: Abre as páginas do Top 5 em navegador headless para confirmar se as ofertas continuam ativas e se os preços conferem.
4. **Cálculo do Total Real**: Menor preço à vista (Pix/boleto) + frete para o CEP regional.
5. **Notificação no Discord**: Envia embed com o ranking consolidado, links diretos e destaque de cupons ativos.

---

## 🎯 Alvo do Monitoramento

| Plataforma | Tipo de Coleta | Alvos |
|------------|----------------|-------|
| **Amazon Brasil** | Busca parametrizada & PDP | Notebooks Gamer com RTX 4060 e RTX 5050 |
| **Comunidade Promobit** | API JSON & Busca HTML | Ofertas da comunidade validadas com cupons |

O critério de ordenação é o **menor custo total** (à vista + frete). Frete grátis entra como `R$ 0,00`.

---

## 🛠️ Como rodar localmente

Requisitos: **Node.js 20+** e [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/AdleyRodrigues/lg-price-tracker.git
cd lg-price-tracker
pnpm install
pnpm exec ts-node src/tracker.ts
```

Ou, equivalentemente:

```bash
pnpm start
```

Para rodar os testes automatizados:

```bash
pnpm test
```

---

## ☁️ Automação na nuvem

O workflow `.github/workflows/monitor.yml` executa a checagem automaticamente:

| Gatilho | Quando |
|---------|--------|
| Agenda (`cron`) | A cada **4 horas** (`0 */4 * * *`, horário UTC) |
| Manual | Aba **Actions** → **Monitor - Notebooks Gamer (RTX 4060 / 5050)** → **Run workflow** |

Pelo terminal (com [GitHub CLI](https://cli.github.com/) autenticado):

```bash
gh workflow run monitor.yml
gh run watch
```

---

## 📁 Estrutura do projeto

```text
lg-price-tracker/
├── src/
│   ├── config/
│   │   ├── catalogo.ts             # Alvos parametrizados de notebooks
│   │   ├── regras.ts               # Termos, regex de hardware, fretes e pisos
│   │   └── http.ts                 # Cliente Axios configurado com headers
│   ├── domain/
│   │   ├── filtros.ts              # Regras de inclusão/exclusão de hardware
│   │   └── ranking.ts              # Ordenação e formação de pódio
│   ├── scrapers/
│   │   ├── amazon.ts               # Scraper de busca e produtos Amazon
│   │   ├── promobit.ts             # Scraper de API e busca do Promobit
│   │   └── index.ts                # Registry de scrapers ativos
│   ├── services/
│   │   ├── collector.ts            # Coleta concorrente e deduplicação
│   │   ├── discord.ts              # Formatação e envio de embeds Discord
│   │   └── verificador-playwright.ts # Validação de front-end com Playwright
│   └── tracker.ts                  # Ponto de entrada do monitor principal
├── .github/workflows/
│   ├── monitor.yml                 # Workflow do monitor de notebooks
│   └── supermercado.yml            # Workflow do monitor de supermercado
├── tests/                          # Suíte de testes unitários com Vitest
├── package.json
└── tsconfig.json
```

---

## 📦 Principais Dependências

- **playwright** — validação real de páginas web no Chromium headless
- **axios** — requisições HTTP rápidas para endpoints e APIs
- **cheerio** — parsing de HTML e extração de dados
- **vitest** — execução da suíte de testes unitários
- **ts-node** — execução de código TypeScript direto
