// Vocabulário EPPO (offline, curado) — códigos padrão de espécie (ex.: CHEAL =
// Chenopodium album). Servido como asset estático public/eppo.json; cada entrada
// foi verificada na EPPO Global Database (gd.eppo.int). Extensível: basta
// acrescentar linhas ao JSON (código + nome científico verificados).
export interface EppoEntry {
  code: string;
  name: string; // nome científico preferido
  family?: string;
  common_pt?: string; // nome comum em pt-PT (auxílio de pesquisa)
}

let cache: EppoEntry[] | null = null;

export async function loadEppo(): Promise<EppoEntry[]> {
  if (cache) return cache;
  const baseUrl = import.meta.env.BASE_URL || "/";
  try {
    const r = await fetch(`${baseUrl}eppo.json`);
    cache = r.ok ? ((await r.json()) as EppoEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

// pesquisa tolerante por código, nome científico ou nome comum (pt). Devolve as
// melhores correspondências ordenadas (prefixo > contém), limitado a `limit`.
export function searchEppo(entries: EppoEntry[], q: string, limit = 8): EppoEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const score = (e: EppoEntry): number => {
    const code = e.code.toLowerCase();
    const name = e.name.toLowerCase();
    const common = (e.common_pt ?? "").toLowerCase();
    if (code === s) return 0;
    if (code.startsWith(s)) return 1;
    if (name.startsWith(s)) return 2;
    if (common.startsWith(s)) return 3;
    if (name.includes(s)) return 4;
    if (common.includes(s)) return 5;
    if (code.includes(s)) return 6;
    return Infinity;
  };
  return entries
    .map((e) => [score(e), e] as const)
    .filter(([sc]) => sc !== Infinity)
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map(([, e]) => e);
}
