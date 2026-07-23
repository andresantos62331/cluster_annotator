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

// normaliza um nome científico para comparação (maiúsculas, espaços a mais)
const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

// Coerência entre o NOME da espécie e o CÓDIGO que lhe está atribuído. Serve de
// rede para códigos escritos à mão: "Fumaria officinalis" com FUMMU (= Fumaria
// muralis) é um engano silencioso que só se apanha assim.
//  - "ok": o código existe na base e é mesmo o desta espécie
//  - "mismatch": o código existe na base MAS é de outra espécie (erro provável);
//    `suggestion` traz o código certo quando o nome da espécie está na base
//  - "unknown": código fora da base curada — legítimo (a base não é exaustiva),
//    apenas não confirmável
export type EppoCheck =
  | { kind: "ok"; entry: EppoEntry }
  | { kind: "mismatch"; entry: EppoEntry; suggestion?: EppoEntry }
  | { kind: "unknown" }
  | null;

export function checkEppo(entries: EppoEntry[], code: string, label: string): EppoCheck {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  const entry = entries.find((e) => e.code.toUpperCase() === c);
  if (!entry) return { kind: "unknown" };
  if (norm(entry.name) === norm(label)) return { kind: "ok", entry };
  const suggestion = entries.find((e) => norm(e.name) === norm(label));
  return { kind: "mismatch", entry, suggestion };
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
