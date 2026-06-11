// Paleta fixa de 36 cores distintas (CONTRATO — a Dra memoriza espécie<->cor ao
// longo do trabalho, e o índice por espécie é persistido em tese3.species_colors).
// Não reordenar nem alterar esta lista.
export const PALETTE: string[] = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4",
  "#f032e6", "#bfef45", "#fabed4", "#469990", "#dcbeff", "#c68642",
  "#b22222", "#aaffc3", "#b5b35c", "#ffd8b1", "#5d8aa8", "#ffe119",
  "#00ced1", "#ff6347", "#7fff00", "#ff1493", "#1e90ff", "#ffa500",
  "#adff2f", "#da70d6", "#20b2aa", "#cd5c5c", "#6495ed", "#dda0dd",
  "#90ee90", "#f0e68c", "#ff8c00", "#40e0d0", "#ee82ee", "#98fb98",
];

// Cor de texto (preto/branco) com bom contraste sobre uma cor de fundo hex.
export function textOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? "#1a160f" : "#fff";
}

// Cor do badge de geração do recluster do ruído (G1, G2, ...). G0 (inicial) não
// tem badge. Escurece com a geração para dar noção de "profundidade". Tom âmbar,
// distinto das cores de espécie (PALETTE) — CONTRATO conceptual preservado.
const GEN_COLORS = ["#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];
export function genColor(gen: number): string {
  if (gen <= 0) return "";
  return GEN_COLORS[Math.min(gen - 1, GEN_COLORS.length - 1)];
}

// Mesma cor em rgba com alpha — para véus translúcidos.
export function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
