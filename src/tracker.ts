import { coletarOfertas } from './services/collector';
import { enviarParaDiscord } from './services/discord';
import { ordenarPorTotal } from './domain/ranking';
import { validarTopOfertasComPlaywright } from './services/verificador-playwright';
import { TAMANHO_PODIO } from './config/regras';

async function main(): Promise<void> {
  const coletadas = await coletarOfertas();
  const ordenadas = ordenarPorTotal(coletadas);

  if (ordenadas.length === 0) {
    console.warn('Nenhuma oferta ativa após as consultas. Nada enviado ao Discord.');
    return;
  }

  console.log(`\n[Validador Frontend] Executando verificação de front com Playwright no Top ${TAMANHO_PODIO}...`);
  const ofertasValidadas = await validarTopOfertasComPlaywright(ordenadas, TAMANHO_PODIO);

  if (ofertasValidadas.length === 0) {
    console.warn('Nenhuma oferta permaneceu válida após a validação do Playwright. Nada enviado ao Discord.');
    return;
  }

  await enviarParaDiscord(ofertasValidadas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});

