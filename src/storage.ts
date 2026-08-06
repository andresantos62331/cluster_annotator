import type { GroundTruth } from "./types";
import { isReservada, PALETTE } from "./colors";

// CONTRATO: mesmas chaves de localStorage da app original (ground truth keyed por
// filename, partilhado entre as 4 configs). Não renomear sem migração explícita.
const GT_KEY = "tese3.ground_truth";
const LABELS_KEY = "tese3.labels";
const CLOUD_KEY = "tese3.cloud_key";
const COLORS_KEY = "tese3.species_colors";
// mapa espécie -> código EPPO. Auxiliar local (como as cores), MAS — ao contrário
// das cores — ENTRA no export/cloud, porque é o output padronizado do trabalho.
const EPPO_KEY = "tese3.species_eppo";
// extra (não-contrato): timestamp do último envio para a cloud, para o indicador
// de estado "local vs. cloud". Só informativo; ausência é tratada com segurança.
const CLOUD_AT_KEY = "tese3.cloud_saved_at";
// id (data) da entrada de novidades mais recente que já foi vista neste browser
const NOVIDADES_KEY = "tese3.novidades_vista";

// Mapa persistente espécie -> cor (hex). Mantém-se entre sessões (e não se apaga ao
// remover uma espécie) para a cor de cada espécie ser fixa. A Dra pode personalizar
// via color picker. Formato antigo (índice na PALETTE) é migrado ao carregar.
export function loadColorMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COLORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | number>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = typeof v === "number" ? PALETTE[v % PALETTE.length] ?? "#9ca3af" : v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveColorMap(m: Record<string, string>): void {
  localStorage.setItem(COLORS_KEY, JSON.stringify(m));
}

// mapa espécie -> código EPPO (ex.: { "Chenopodium album": "CHEAL" })
export function loadEppoMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(EPPO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEppoMap(m: Record<string, string>): void {
  localStorage.setItem(EPPO_KEY, JSON.stringify(m));
}

// mapa espécie -> família botânica. Override manual (para espécies sem código na
// base curada); quando ausente, a família deriva do código via o vocabulário.
const FAMILY_KEY = "tese3.species_family";
export function loadFamilyMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FAMILY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFamilyMap(m: Record<string, string>): void {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(m));
}

// mapa etiqueta -> NÍVEL TAXONÓMICO da identificação (acordado na reunião de
// 2026-07-22). Ausência = "especie", que é o caso normal e mantém tudo o que já
// foi anotado válido sem migração.
//
// Existe porque há plântulas que a fotografia não permite identificar até à
// espécie — as gramíneas em particular, que dependem de apêndices da folha e de
// pelos que a imagem não capta. Em vez de forçar uma espécie incerta ou de
// descartar a imagem, registamos honestamente o nível a que a identificação foi
// feita. A jusante decide-se se as famílias entram como classe grosseira ou se
// ficam de fora do treino.
const RANK_KEY = "tese3.species_rank";
export function loadRankMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(RANK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRankMap(m: Record<string, string>): void {
  localStorage.setItem(RANK_KEY, JSON.stringify(m));
}

export function loadGT(): GroundTruth {
  try {
    const raw = localStorage.getItem(GT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGT(gt: GroundTruth): void {
  localStorage.setItem(GT_KEY, JSON.stringify(gt));
}

export function loadLabels(): string[] {
  try {
    const raw = localStorage.getItem(LABELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLabels(labels: string[]): void {
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

// --- chave de acesso à cloud (vinda do link mágico ?k=...) ---
export function getCloudKey(): string {
  return localStorage.getItem(CLOUD_KEY) ?? "";
}

export function setCloudKey(key: string): void {
  localStorage.setItem(CLOUD_KEY, key);
}

export function getCloudSavedAt(): number | null {
  const raw = localStorage.getItem(CLOUD_AT_KEY);
  return raw ? Number(raw) : null;
}

export function setCloudSavedAt(ts: number): void {
  localStorage.setItem(CLOUD_AT_KEY, String(ts));
}

// --- novidades ---
// Guarda-se o id (data) da entrada mais recente já vista. Vazio quer dizer duas
// coisas MUITO diferentes, e quem decide é o App (só ele sabe se há trabalho
// feito): browser novo = primeira visita, nada a anunciar; browser com anotações
// = quem já andava a trabalhar antes de isto existir, e é justamente a pessoa a
// quem o aviso interessa.
export function getNovidadeVista(): string {
  return localStorage.getItem(NOVIDADES_KEY) ?? "";
}

export function setNovidadeVista(id: string): void {
  localStorage.setItem(NOVIDADES_KEY, id);
}

// --- serializadores (CONTRATO de export — o investigador consome isto) ---
// `eppo`: mapa espécie -> código EPPO. JSON ganha o mapa; CSV ganha a coluna
// eppo_code (código da etiqueta de cada linha). Retrocompatível na importação.
export function buildJSON(
  gt: GroundTruth,
  labels: string[],
  eppo: Record<string, string> = {},
  family: Record<string, string> = {},
  rank: Record<string, string> = {},
): string {
  return JSON.stringify(
    { exported_at: new Date().toISOString(), labels, eppo, family, rank, ground_truth: gt },
    null,
    2,
  );
}

/**
 * CSV do ground truth.
 *
 * Cabeçalho: filename,label,eppo_code,rank
 * A coluna `rank` foi acrescentada em 2026-07-23 (reunião com o orientador). Vale
 * "especie" (omissão), "familia", ou fica vazia quando não há etiqueta.
 *
 * As categorias reservadas (Lixo, A confirmar) aparecem em `label` como qualquer
 * outra etiqueta, com `rank` vazio — não são identificações taxonómicas. Ficam no
 * ficheiro de propósito: a jusante interessa saber quantas e quais foram
 * descartadas, e quais ficaram por decidir.
 */
export function buildCSV(
  gt: GroundTruth,
  allFilenames: string[],
  eppo: Record<string, string> = {},
  rank: Record<string, string> = {},
): string {
  const header = "filename,label,eppo_code,rank";
  const rows = allFilenames.map((f) => {
    const lbl = gt[f] ?? "";
    const code = lbl ? eppo[lbl] ?? "" : "";
    const r = lbl && !isReservada(lbl) ? rank[lbl] || "especie" : "";
    return `${f},${lbl},${code},${r}`;
  });
  return [header, ...rows].join("\n");
}

export function exportJSON(
  gt: GroundTruth,
  labels: string[],
  eppo: Record<string, string> = {},
  family: Record<string, string> = {},
  rank: Record<string, string> = {},
): void {
  download(buildJSON(gt, labels, eppo, family, rank), "ground_truth.json", "application/json");
}

export function exportCSV(
  gt: GroundTruth,
  allFilenames: string[],
  eppo: Record<string, string> = {},
  rank: Record<string, string> = {},
): void {
  download(buildCSV(gt, allFilenames, eppo, rank), "ground_truth.csv", "text/csv");
}

// --- guardar na cloud: POST ao Worker -> commit no GitHub (branch data) ---
export interface CloudResult {
  ok: boolean;
  count: number;
  commit?: string;
  error?: string;
}

export async function saveToCloud(
  gt: GroundTruth,
  labels: string[],
  allFilenames: string[],
  eppo: Record<string, string> = {},
  family: Record<string, string> = {},
  rank: Record<string, string> = {},
): Promise<CloudResult> {
  const count = Object.keys(gt).length;
  const key = getCloudKey();
  if (!key) {
    return {
      ok: false,
      count,
      error: "sem chave de acesso. Abre o link que recebeste (com ?k=...)",
    };
  }
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        json: buildJSON(gt, labels, eppo, family, rank),
        csv: buildCSV(gt, allFilenames, eppo, rank),
        count,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<CloudResult>;
    if (!res.ok) {
      return { ok: false, count, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, count, commit: data.commit };
  } catch (e) {
    return { ok: false, count, error: String(e) };
  }
}

// --- carregar da cloud: GET ao Worker -> ground_truth.json da branch data ---
export interface CloudLoad {
  ok: boolean;
  json?: string | null; // conteúdo do ground_truth.json (null = ainda não existe)
  error?: string;
}

export async function loadFromCloud(): Promise<CloudLoad> {
  const key = getCloudKey();
  if (!key) return { ok: false, error: "sem chave de acesso" };
  try {
    const res = await fetch(`/api/load?k=${encodeURIComponent(key)}`);
    const data = (await res.json().catch(() => ({}))) as Partial<CloudLoad>;
    if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` };
    return { ok: true, json: data.json ?? null };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function download(content: string, name: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
