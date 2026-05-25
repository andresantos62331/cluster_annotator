import type { GroundTruth } from "./types";

const GT_KEY = "tese3.ground_truth";
const LABELS_KEY = "tese3.labels";

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

export function exportJSON(gt: GroundTruth, labels: string[]): void {
  const data = {
    exported_at: new Date().toISOString(),
    labels,
    ground_truth: gt,
  };
  download(JSON.stringify(data, null, 2), "ground_truth.json", "application/json");
}

export function exportCSV(gt: GroundTruth, allFilenames: string[]): void {
  const header = "filename,label";
  const rows = allFilenames.map((f) => `${f},${gt[f] ?? ""}`);
  download([header, ...rows].join("\n"), "ground_truth.csv", "text/csv");
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
