import { useEffect, useRef, useState } from "react";
import type { ConfigDef } from "../types";
import { Ring } from "./bits";
import { IconBell, IconChevron, IconCloud, IconDownload, IconJson, IconTable, IconUpload } from "./icons";

export function TopBar({
  defs,
  configId,
  onConfig,
  nClusters,
  nNoise,
  totalAnnotated,
  totalAll,
  hideMeter,
  cloudState,
  cloudSaving,
  onCloudSave,
  onExportJSON,
  onExportCSV,
  onImport,
  onHelp,
  onNovidades,
  novidadesPorLer,
}: {
  defs: ConfigDef[];
  configId: string;
  onConfig: (id: string) => void;
  nClusters: number;
  nNoise: number;
  totalAnnotated: number;
  totalAll: number;
  // esconde o medidor global (na tab Coleção a info já está no resumo)
  hideMeter: boolean;
  cloudState: "synced" | "pending" | "none";
  cloudSaving: boolean;
  onCloudSave: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImport: (f: File) => void;
  onHelp: () => void;
  onNovidades: () => void;
  novidadesPorLer: boolean;
}) {
  const [techOpen, setTechOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = totalAll ? (totalAnnotated / totalAll) * 100 : 0;
  const def = defs.find((d) => d.id === configId);

  // fecha popovers ao clicar fora
  useEffect(() => {
    if (!techOpen && !menuOpen) return;
    const h = () => {
      setTechOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [techOpen, menuOpen]);

  const cloudText =
    cloudState === "synced" ? "Cloud sincronizada" : cloudState === "pending" ? "Alterações por enviar" : "Só local";

  return (
    <header className="topbar">
      <div className="wordmark">
        <svg className="glyph" viewBox="0 0 32 32">
          <path d="M16 28V12" stroke="#e7dcc6" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 17c0-4.2 2.9-7.3 7.8-7.8C23.3 14 20.7 17 16 17Z" fill="#7a9a5e" />
          <path d="M16 13c0-4.2-2.9-7.3-7.8-7.8C8.7 10 11.3 13 16 13Z" fill="#5f7d4f" />
          <circle cx="16" cy="25" r="2.6" fill="#ff6a3d" />
        </svg>
        <div className="wm-text">
          <span className="wm-title">Herbário</span>
          <span className="wm-sub">anotador de clusters</span>
        </div>
      </div>

      <div className="divider" />

      {/* dial de zoom: A (granular) → D (agrupado) */}
      <div className="zoom-dial">
        <div className="zd-label">
          <span>granularidade</span>
          <span className="zd-scale" aria-hidden>
            <i style={{ height: 9 }} />
            <i style={{ height: 7 }} />
            <i style={{ height: 5 }} />
            <i style={{ height: 3 }} />
          </span>
        </div>
        <div className="seg">
          {defs.map((d, i) => (
            <button
              key={d.id}
              className={d.id === configId ? "on" : ""}
              onClick={() => onConfig(d.id)}
              title={d.label}
            >
              <span className="seg-key">{["A", "B", "C", "D"][i]}</span>
              {d.short}
            </button>
          ))}
        </div>
      </div>

      {/* parâmetros técnicos — discretos (para o autor/orientadores) */}
      <div className="tech-pop" onClick={(e) => e.stopPropagation()}>
        <button className="tech-btn" onClick={() => setTechOpen((v) => !v)} title="parâmetros de clustering">
          ⓘ
        </button>
        {techOpen && (
          <div className="tech-card">
            <div className="tc-h">{def?.label} · parâmetros</div>
            <div className="tc-v">{def?.tech}</div>
            <div className="tc-note">
              UMAP + HDBSCAN. Detalhe técnico — não afeta a anotação.
            </div>
          </div>
        )}
      </div>

      <div className="cluster-summary">
        <span>
          <b>{nClusters}</b> grupos
        </span>
        <span className="cs-noise">
          <b>{nNoise}</b> no ruído
        </span>
      </div>

      <div className="spacer" />

      <div className={`global-meter ${hideMeter ? "is-hidden" : ""}`} aria-hidden={hideMeter}>
        <div className="gm-figures">
          <div className="gm-pct">
            <b>{pct.toFixed(2)}</b><span className="gm-pct-sign">%</span>
          </div>
          <div className="gm-label">
            {totalAnnotated.toLocaleString("pt-PT")} / {totalAll.toLocaleString("pt-PT")} anotadas
          </div>
        </div>
        <div className="gm-ring">
          <Ring pct={pct} size={46} stroke={5} showLabel={false} />
        </div>
      </div>

      <div className="divider" />

      <div className="data-actions">
        <button className="icon-btn primary" onClick={onCloudSave} disabled={cloudSaving} title={cloudText}>
          <span className={`cloud-dot ${cloudState}`} />
          <IconCloud />
          {cloudSaving ? "A enviar…" : "Guardar na cloud"}
        </button>

        <div className="menu-pop" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} title="Exportar / Importar">
            <IconDownload />
            Dados
            <IconChevron size={13} />
          </button>
          {menuOpen && (
            <div className="menu-card">
              <button onClick={() => { onExportJSON(); setMenuOpen(false); }}>
                <IconJson /> Exportar JSON
              </button>
              <button onClick={() => { onExportCSV(); setMenuOpen(false); }}>
                <IconTable /> Exportar CSV
              </button>
              <div className="mc-sep" />
              <button onClick={() => fileRef.current?.click()}>
                <IconUpload /> Importar JSON…
              </button>
              <div className="mc-sep" />
              <div className="mc-note">
                O trabalho fica guardado <b>neste browser</b> à medida que anotas.
                «Guardar na cloud» envia uma cópia para o repositório; exportar grava
                um ficheiro no computador.
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
              setMenuOpen(false);
            }}
          />
        </div>

        {/* sino das novidades — o ponto só acende quando há entrada por ler, e
            apaga-se ao abrir. Sem contagem: não é uma caixa de correio. */}
        <button
          className={`tech-btn nov-btn ${novidadesPorLer ? "tem" : ""}`}
          onClick={onNovidades}
          title={novidadesPorLer ? "Há novidades na ferramenta" : "Novidades da ferramenta"}
        >
          <IconBell size={13} />
          {novidadesPorLer && <span className="nov-ponto" aria-hidden />}
        </button>

        <button className="tech-btn help-btn" onClick={onHelp} title="Ajuda e atalhos (?)">
          ?
        </button>
      </div>
    </header>
  );
}
