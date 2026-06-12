// Cloudflare Worker: serve os assets estaticos e expoe POST /api/save, que
// faz commit do ground truth (JSON + CSV) no GitHub, numa branch de dados.
// O PAT do GitHub e a chave de acesso vivem como secrets do Worker — nunca
// chegam ao browser. Contrato preservado da app original.

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GITHUB_TOKEN: string; // PAT fine-grained, Contents R/W no repo
  SAVE_KEY: string;     // chave partilhada (link magico ?k=...)
  // topico ntfy.sh para notificar saves (OPCIONAL; runtime var no dashboard,
  // nao no repo — o repo e' publico e o topico deve ser segredo). Sem ele,
  // o save funciona na mesma, so nao notifica.
  NTFY_TOPIC?: string;
}

const REPO = "andresantos62331/cluster_annotator";
const BRANCH = "data";
const GH = "https://api.github.com";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/save") {
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
      return handleSave(request, env);
    }
    // tudo o resto: assets estaticos (com fallback SPA via not_found_handling)
    return env.ASSETS.fetch(request);
  },
};

async function handleSave(request: Request, env: Env): Promise<Response> {
  let body: { key?: string; json?: string; csv?: string; count?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (!env.SAVE_KEY || body.key !== env.SAVE_KEY) {
    return json({ error: "unauthorized" }, 401);
  }
  if (typeof body.json !== "string" || typeof body.csv !== "string") {
    return json({ error: "missing payload" }, 400);
  }
  // limite defensivo de tamanho (~5 MB por ficheiro)
  if (body.json.length > 5_000_000 || body.csv.length > 5_000_000) {
    return json({ error: "payload too large" }, 413);
  }

  const stamp = new Date().toISOString();
  const message = `ground truth: ${body.count ?? "?"} labels @ ${stamp}`;

  try {
    const commit = await putFile("ground_truth.json", body.json, message, env);
    await putFile("ground_truth.csv", body.csv, message, env);
    await notifySave(body.count ?? 0, env); // nunca falha o save
    return json({ ok: true, count: body.count ?? 0, commit });
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
}

// notificacao push via ntfy.sh quando alguem guarda na cloud (best-effort:
// qualquer erro e' engolido — a notificacao nunca pode estragar um save)
async function notifySave(count: number, env: Env): Promise<void> {
  if (!env.NTFY_TOPIC) return;
  try {
    const when = new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
    await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        // ATENCAO: headers HTTP so aceitam ASCII — um travessao aqui faz o
        // fetch lancar e a notificacao morrer em silencio (bug 2026-06-12)
        Title: "Herbario - progresso guardado",
        Tags: "seedling",
        Priority: "default",
      },
      body: `${count} anotacoes guardadas na cloud (${when})`,
    });
  } catch {
    // best-effort
  }
}

// cria ou actualiza um ficheiro na branch de dados via Contents API
async function putFile(path: string, content: string, message: string, env: Env): Promise<string | undefined> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "cluster-annotator-worker",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // sha actual e' necessario para update; ausente (404) => criar de novo
  let sha: string | undefined;
  const getRes = await fetch(`${GH}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, { headers });
  if (getRes.ok) {
    const j = (await getRes.json()) as { sha?: string };
    sha = j.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`GET ${path}: ${getRes.status} ${await getRes.text()}`);
  }

  const putRes = await fetch(`${GH}/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: b64(content),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    throw new Error(`PUT ${path}: ${putRes.status} ${await putRes.text()}`);
  }
  const out = (await putRes.json()) as { commit?: { sha?: string } };
  return out.commit?.sha;
}

// base64 de uma string UTF-8 (btoa sozinho rebenta com nao-ASCII)
function b64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
