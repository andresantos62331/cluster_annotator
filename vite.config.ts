import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

// Em produção, POST /api/save é servido pelo Cloudflare Worker (ver worker.ts).
// Em dev (standalone) esse Worker não existe; este middleware responde de forma
// honesta para o botão "Guardar na cloud" não rebentar nem mentir: confirma que
// os dados estão seguros em localStorage e que o envio só acontece no deploy.
function devCloudSaveStub(): PluginOption {
  return {
    name: "dev-cloud-save-stub",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/save", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let count = 0;
          try {
            count = JSON.parse(body || "{}").count ?? 0;
          } catch {
            /* ignore */
          }
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error:
                "Envio para a cloud só no deploy (Cloudflare Worker). " +
                "Em dev as anotações ficam guardadas em localStorage.",
              count,
            }),
          );
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devCloudSaveStub()],
});
