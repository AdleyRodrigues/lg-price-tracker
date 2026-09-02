import { coletarOfertas } from './services/collector';
import { enviarParaDiscord } from './services/discord';
import { ordenarPorTotal } from './domain/ranking';

async function main(): Promise<void> {
  const coletadas = await coletarOfertas();
  const ofertas = ordenarPorTotal(coletadas);

  if (ofertas.length === 0) {
    console.warn('Nenhuma oferta ativa após as consultas. Nada enviado ao Discord.');
    return;
  }

  await enviarParaDiscord(ofertas);
}

main().catch((err) => {
  console.error('Erro ao executar o tracker:', err);
  process.exit(1);
});
