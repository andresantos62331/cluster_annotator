export interface Assignment {
  filename: string;
  cluster_id: number;
}

export interface ClusterMetrics {
  cluster_id: number;
  size: number;
  cohesion_mean: number | null;
  cohesion_min: number | null;
  separation: number | null;
  nearest_cluster: number | null;
  persistence: number | null;
}

export interface ConfigDef {
  id: string;
  label: string;
  assignmentsUrl: string;
  metricsUrl: string;
}

export interface ConfigData {
  id: string;
  label: string;
  assignments: Assignment[];
  metrics: Map<number, ClusterMetrics>;
  clusterIds: number[];
  byCluster: Map<number, string[]>;
}

export type GroundTruth = Record<string, string>;

export interface AppState {
  configs: ConfigDef[];
  currentConfigId: string;
  currentClusterId: number | null;
  page: number;
  selection: Set<string>;
  speciesSelection: Set<string>;
  groundTruth: GroundTruth;
  labels: string[];
  activeTab: "clusters" | "species";
  lightbox: { open: boolean; filename: string | null };
  speciesPage: Record<string, number>;
}
