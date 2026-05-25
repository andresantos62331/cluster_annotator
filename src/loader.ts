import { parseCSV } from "./csv";
import type { Assignment, ClusterMetrics, ConfigData, ConfigDef } from "./types";

export const CONFIG_DEFS: ConfigDef[] = [
  {
    id: "best_dbcv",
    label: "best DBCV (eom mcs=15 ms=5, nn=50 nc=5) — 40 clusters",
    assignmentsUrl: "configs/best_dbcv.csv",
    metricsUrl: "configs/best_dbcv_metrics.csv",
  },
  {
    id: "A_eom_granular",
    label: "A — eom granular (mcs=5 ms=3, nn=15 nc=10) — 113 clusters",
    assignmentsUrl: "configs/A_eom_granular.csv",
    metricsUrl: "configs/A_eom_granular_metrics.csv",
  },
  {
    id: "B_leaf_aggressive",
    label: "B — leaf agressivo (mcs=5 ms=3, nn=10 nc=10) — 216 clusters",
    assignmentsUrl: "configs/B_leaf_aggressive.csv",
    metricsUrl: "configs/B_leaf_aggressive_metrics.csv",
  },
  {
    id: "C_leaf_comparable",
    label: "C — leaf comparável (mcs=8 ms=5, nn=15 nc=20) — 112 clusters",
    assignmentsUrl: "configs/C_leaf_comparable.csv",
    metricsUrl: "configs/C_leaf_comparable_metrics.csv",
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
    });
  }

  const byCluster = new Map<number, string[]>();
  for (const a of assignments) {
    if (!byCluster.has(a.cluster_id)) byCluster.set(a.cluster_id, []);
    byCluster.get(a.cluster_id)!.push(a.filename);
  }

  // Ordem: clusters reais por size desc, depois noise (-1) por último
  const clusterIds = Array.from(byCluster.keys())
    .filter((c) => c !== -1)
    .sort((a, b) => (byCluster.get(b)!.length - byCluster.get(a)!.length));
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
