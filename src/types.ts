// Contratos de dados — preservados da app original (ver FRONTEND_HANDOFF secção 3).

export interface Assignment {
  filename: string;
  cluster_id: number;
  // geracao do recluster do ruido: 0 = inicial (G0), 1 = G1, ... ; -1 = ruido final
  origem?: number;
}

export interface ClusterMetrics {
  cluster_id: number;
  size: number;
  cohesion_mean: number | null;
  cohesion_min: number | null;
  separation: number | null;
  nearest_cluster: number | null;
  persistence: number | null;
  // geracao que criou este cluster (0 = inicial). Alimenta o badge G1/G2/...
  origem?: number;
}

export interface ConfigDef {
  id: string;
  label: string;
  // nome curto da escala de zoom (Microscópio … Panorama)
  short: string;
  // parametros tecnicos (UMAP/HDBSCAN) — mostrados discretos, para o autor/orientadores
  tech?: string;
  assignmentsUrl: string;
  metricsUrl: string;
  // mapa cluster_id -> filename mais perto do centroide (miniatura representativa)
  repsUrl?: string;
}

export interface ConfigData {
  id: string;
  label: string;
  assignments: Assignment[];
  metrics: Map<number, ClusterMetrics>;
  clusterIds: number[];
  byCluster: Map<number, string[]>;
  // representante (mais perto do centroide) por cluster; fallback no 1º membro
  reps: Map<number, string>;
}

export type GroundTruth = Record<string, string>;

// Geometria de um crop dentro da sua imagem original (recuperada por template
// matching — ver _build_crop_geometry.py). (x,y,w,h) = rect do crop no original
// EXIBIDO (com EXIF aplicado, como o browser mostra); (iw,ih) = dimensões do
// original exibido; rot = rotação CW (0/90/180/270) a aplicar ao recorte
// masked/ (extraído em espaço raw) para o alinhar sobre o original.
export interface CropGeo {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  iw: number;
  ih: number;
  rot: number;
  score: number;
}

export type CropGeometry = Record<string, CropGeo>;
