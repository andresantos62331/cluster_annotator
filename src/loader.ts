import { parseCSV } from "./csv";
import type { Assignment, ClusterMetrics, ConfigData, ConfigDef } from "./types";

// Decisão com os orientadores (2026-06-10): ficam só os dois métodos leaf — o que
// melhor recupera ruído na iteração (handoff 7.2). A (Microscópio, mais granular) e
// Padrão (mais agrupado), renumerada para B. Os ids/ficheiros internos mantêm-se
// (A_microscopio, C_padrao) — só muda o rótulo visível. O técnico fica no tooltip.
export const CONFIG_DEFS: ConfigDef[] = [
  {
    id: "A_microscopio",
    label: "A: Microscópio",
    short: "Microscópio",
    tech: "leaf · mcs=5 ms=3 · nn=10 nc=10",
    assignmentsUrl: "configs/A_microscopio.csv",
    metricsUrl: "configs/A_microscopio_metrics.csv",
    repsUrl: "configs/A_microscopio_reps.json",
  },
  // O "B: Padrao" (C_padrao) saiu do selector a 2026-09-04: ninguem lhe mexia e
  // e' mediveis vezes pior — 191 grupos contra 321, pureza 0,871 contra 0,929,
  // 49% de grupos mono-especie contra 70% (HANDOFF 10.2). Ter um so' metodo
  // significa tambem que os lotes novos entram sempre agrupados da mesma forma.
  // Os CSV ficam no disco; basta repor esta entrada para voltar atras.
];

export async function loadConfig(def: ConfigDef): Promise<ConfigData> {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [assignmentsText, metricsText, repsObj] = await Promise.all([
    fetch(`${baseUrl}${def.assignmentsUrl}`).then((r) => r.text()),
    fetch(`${baseUrl}${def.metricsUrl}`).then((r) => r.text()),
    def.repsUrl
      ? fetch(`${baseUrl}${def.repsUrl}`)
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}))
      : Promise.resolve({} as Record<string, string>),
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
      lote: r.lote != null && r.lote !== "" ? r.lote : undefined,
    });
  }

  const byCluster = new Map<number, string[]>();
  for (const a of assignments) {
    if (!byCluster.has(a.cluster_id)) byCluster.set(a.cluster_id, []);
    byCluster.get(a.cluster_id)!.push(a.filename);
  }

  // Ordem (CONTRATO): por geração ascendente (G0 primeiro, depois G1, G2...), e
  // por size desc dentro de cada geração; ruído (-1) sempre por último.
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

  // representante por cluster (mais perto do centroide); chaves vêm como string
  const reps = new Map<number, string>();
  for (const [cid, fn] of Object.entries(repsObj as Record<string, string>)) {
    reps.set(parseInt(cid, 10), fn);
  }

  return {
    id: def.id,
    label: def.label,
    assignments,
    metrics,
    clusterIds,
    byCluster,
    reps,
  };
}
