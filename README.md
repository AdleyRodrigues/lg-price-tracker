# LG Price Tracker

Bot em **Node.js + TypeScript** que compara o preço de ar-condicionado LG (à vista + frete) e envia um alerta formatado no **Discord**.

Roda na sua máquina ou sozinho na nuvem, a cada 4 horas, via GitHub Actions.

---

## O que ele faz

1. Junta as ofertas das lojas (hoje: Amazon e Loja Oficial LG).
2. Calcula o **total real**: preço à vista (Pix) + frete para o CEP **60440-240**.
3. Destaca o menor valor.
4. Manda um embed no Discord, mencionando você, com ranking, totais e link direto da melhor oferta.

Clicar no título do embed abre a página de compra do vencedor. Cada item do ranking tem o link **Ver oferta**.

---

## Produtos monitorados

| Loja | Modelo | Página |
|------|--------|--------|
| Amazon | Dual Inverter Voice 9000 Só Frio **S3-Q09AA31F** | [Abrir na Amazon](https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H) |
| Loja Oficial LG | Dual Inverter Voice 9000 Só Frio **S3-Q09AA33F** | [Abrir na LG](https://www.lg.com/br/ar-condicionado-residencial/dual-inverter-split/s3-q09aa33f/) |

O critério de desempate é só o **menor total** (à vista + frete). Frete grátis entra como `R$ 0,00`.

---

## Como rodar localmente

Requisitos: **Node.js 20+** e [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/AdleyRodrigues/lg-price-tracker.git
cd lg-price-tracker
pnpm install
pnpm exec ts-node src/tracker.ts
```

Ou, equivalente:

```bash
pnpm start
```

O terminal imprime os **valores brutos** raspados de cada página (preço e frete) antes de enviar o ranking ao Discord.

---

## Automação na nuvem

O workflow `.github/workflows/monitor.yml` faz o mesmo na nuvem:

| Gatilho | Quando |
|---------|--------|
| Agenda (`cron`) | A cada **4 horas** (`0 */4 * * *`, horário UTC) |
| Manual | Aba **Actions** → **Monitor de preços** → **Run workflow** |

Pelo terminal (com [GitHub CLI](https://cli.github.com/) autenticado):

```bash
gh workflow run monitor.yml
gh run watch
```

Acompanhe as execuções em:  
https://github.com/AdleyRodrigues/lg-price-tracker/actions

---

## Onde ajustar as coisas

Tudo relevante está em `src/tracker.ts`:

| Constante / lista | Função |
|-------------------|--------|
| `WEBHOOK_URL` | Webhook do canal no Discord |
| `USER_ID` | ID do usuário mencionado no alerta |
| `CEP` | CEP usado no cálculo de frete |
| `FONTES` | URLs das lojas; preços e fretes vêm do HTML em tempo real |

---

## Estrutura do projeto

```text
lg-price-tracker/
├── src/tracker.ts                 # Scraping + comparação + Discord
├── .github/workflows/monitor.yml  # Rodada automática na nuvem (pnpm)
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

---

## Dependências

- **axios** — baixa as páginas e envia o POST para o webhook do Discord
- **cheerio** — faz o parse do HTML (preço e frete)
- **dotenv** — carrega `.env` se você quiser variáveis locais
- **typescript** + **ts-node** — executa o script em TypeScript direto
