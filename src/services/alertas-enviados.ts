import fs from 'fs';
import path from 'path';
import { chaveOferta } from '../lib/url';
import { OfertaSupermercado } from '../types/supermercado';

const ARQUIVO_ALERTAS = path.join(process.cwd(), 'data', 'alertas-enviados.json');

interface EstadoAlertas {
  ids: string[];
}

function lerEstado(): EstadoAlertas {
  try {
    const bruto = fs.readFileSync(ARQUIVO_ALERTAS, 'utf8');
    const parsed = JSON.parse(bruto) as Partial<EstadoAlertas>;
    return { ids: Array.isArray(parsed.ids) ? parsed.ids.filter((id) => typeof id === 'string') : [] };
  } catch {
    return { ids: [] };
  }
}

function gravarEstado(estado: EstadoAlertas): void {
  fs.mkdirSync(path.dirname(ARQUIVO_ALERTAS), { recursive: true });
  fs.writeFileSync(ARQUIVO_ALERTAS, `${JSON.stringify(estado, null, 2)}\n`, 'utf8');
}

export function listarOfertasNovas<T extends OfertaSupermercado>(ofertas: T[]): T[] {
  const enviados = new Set(lerEstado().ids);
  return ofertas.filter((oferta) => !enviados.has(chaveOferta(oferta.url)));
}

export function registrarOfertasEnviadas(ofertas: OfertaSupermercado[]): void {
  if (ofertas.length === 0) return;
  const estado = lerEstado();
  const ids = new Set(estado.ids);
  for (const oferta of ofertas) {
    ids.add(chaveOferta(oferta.url));
  }
  gravarEstado({ ids: [...ids] });
}
