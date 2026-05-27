import type { GroundTruth } from "./types";

const GT_KEY = "tese3.ground_truth";
const LABELS_KEY = "tese3.labels";
const CLOUD_KEY = "tese3.cloud_key";
const COLORS_KEY = "tese3.species_colors";

// Mapa persistente especie -> indice na PALETTE. Mantem-se entre sessoes (e
// nao se apaga ao remover uma especie) para a cor de cada especie ser fixa.
export function loadColorMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COLORS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveColorMap(m: Record<string, number>): void {
  localStorage.setItem(COLORS_KEY, JSON.stringify(m));
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

// --- chave de acesso a cloud (vinda do link magico ?k=...) ---
export function getCloudKey(): string {
  return localStorage.getItem(CLOUD_KEY) ?? "";
}

export function setCloudKey(key: string): void {
  localStorage.setItem(CLOUD_KEY, key);
}

// --- serializadores (partilhados entre export local e cloud) ---
export function buildJSON(gt: GroundTruth, labels: string[]): string {
  return JSON.stringify(
    { exported_at: new Date().toISOString(), labels, ground_truth: gt },
    null,
    2,
  );
}

export function buildCSV(gt: GroundTruth, allFilenames: string[]): string {
  const header = "filename,label";
  const rows = allFilenames.map((f) => `${f},${gt[f] ?? ""}`);
  return [header, ...rows].join("\n");
}

export function exportJSON(gt: GroundTruth, labels: string[]): void {
  download(buildJSON(gt, labels), "ground_truth.json", "application/json");
}

export function exportCSV(gt: GroundTruth, allFilenames: string[]): void {
  download(buildCSV(gt, allFilenames), "ground_truth.csv", "text/csv");
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
): Promise<CloudResult> {
  const count = Object.keys(gt).length;
  const key = getCloudKey();
  if (!key) {
    return { ok: false, count, error: "sem chave de acesso — abre o link que recebeste (com ?k=...)" };
  }
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        json: buildJSON(gt, labels),
        csv: buildCSV(gt, allFilenames),
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

function download(content: string, name: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
