import { parseCSV } from "./csv";
import type { Assignment, ClusterMetrics, ConfigData, ConfigDef } from "./types";

// Ordem granular -> agrupado (A = mais granular). Os CSVs ja incluem o recluster
// iterativo do ruido (coluna origem = geracao). O tecnico (tech) fica discreto.
export const CONFIG_DEFS: ConfigDef[] = [
  {
    id: "A_microscopio",
    label: "A — Microscópio",
    tech: "leaf · mcs=5 ms=3 · nn=10 nc=10",
    assignmentsUrl: "configs/A_microscopio.csv",
    metricsUrl: "configs/A_microscopio_metrics.csv",
  },
  {
    id: "B_detalhe",
    label: "B — Detalhe",
    tech: "eom · mcs=5 ms=3 · nn=15 nc=10",
    assignmentsUrl: "configs/B_detalhe.csv",
    metricsUrl: "configs/B_detalhe_metrics.csv",
  },
  {
    id: "C_padrao",
    label: "C — Padrão",
    tech: "leaf · mcs=8 ms=5 · nn=15 nc=20",
    assignmentsUrl: "configs/C_padrao.csv",
    metricsUrl: "configs/C_padrao_metrics.csv",
  },
  {
    id: "D_panorama",
    label: "D — Panorama",
    tech: "eom · mcs=15 ms=5 · nn=50 nc=5",
    assignmentsUrl: "configs/D_panorama.csv",
    metricsUrl: "configs/D_panorama_metrics.csv",
  },
];

export async function loadConfig(def: ConfigDef): Promise<ConfigData> {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [assignmentsText, metricsText] = await Promise.all([
    fetch(`${baseUrl}${def.assignmentsUrl}`).then((r) => r.text()),
    fetch(`${baseUrl}${def.metricsUrl}`).then((r) => r.text()),
  ]);

  const assignmentsRaw = parseCSV(assignmentsText);
  const assignments: Assignment[] = assignmentsRaw.map((r) => ({
    filename: r.filename,
    cluster_id: parseInt(r.cluster_id, 10),
    origem: r.origem != null && r.origem !== "" ? parseInt(r.origem, 10) : undefined,
  }));

  const metricsRaw = parseCSV(metricsText);
  const metrics = new Map<number, ClusterMetrics>();
  for (const r of metricsRaw) {
    const cid = parseInt(r.cluster_id, 10);
    metrics.set(cid, {
      cluster_id: cid,
      size: parseInt(r.size, 10),
      cohesion_mean: r.cohesion_mean ? parseFloat(r.cohesion_mean) : null,
      cohesion_min: r.cohesion_min ? parseFloat(r.cohesion_min) : null,
      separation: r.separation ? parseFloat(r.separation) : null,
      nearest_cluster: r.nearest_cluster ? parseInt(r.nearest_cluster, 10) : null,
      persistence: r.persistence ? parseFloat(r.persistence) : null,
      origem: r.origem != null && r.origem !== "" ? parseInt(r.origem, 10) : undefined,
    });
  }

  const byCluster = new Map<number, string[]>();
  for (const a of assignments) {
    if (!byCluster.has(a.cluster_id)) byCluster.set(a.cluster_id, []);
    byCluster.get(a.cluster_id)!.push(a.filename);
  }

  // Ordem: por geracao ascendente (G0 primeiro, depois G1, G2...), e por size desc
  // dentro de cada geracao; noise (-1) sempre por último.
  const genOf = (cid: number): number => metrics.get(cid)?.origem ?? 0;
  const clusterIds = Array.from(byCluster.keys())
    .filter((c) => c !== -1)
    .sort((a, b) => {
      const ga = genOf(a);
      const gb = genOf(b);
      if (ga !== gb) return ga - gb;
      return byCluster.get(b)!.length - byCluster.get(a)!.length;
    });
  if (byCluster.has(-1)) clusterIds.push(-1);

  return {
    id: def.id,
    label: def.label,
    assignments,
    metrics,
    clusterIds,
    byCluster,
  };
}
