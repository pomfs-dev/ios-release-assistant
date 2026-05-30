import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { scanFolder } from "./scanFolder.mjs";

const DEFAULT_PORT = 56604;

function parsePort() {
  const portFlagIndex = process.argv.indexOf("--port");
  const rawPort =
    portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : process.env.PORT ?? DEFAULT_PORT;
  const port = Number(rawPort);
  return Number.isFinite(port) ? port : DEFAULT_PORT;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("JSON 요청 본문을 읽지 못했습니다.");
    error.statusCode = 400;
    throw error;
  }
}

async function handleApi(request, response) {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return true;
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      mode: "local",
      message: "iOS Release Assistant local server is running.",
    });
    return true;
  }

  if (url.pathname === "/api/scan-folder" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const result = await scanFolder(body.path);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error.statusCode ?? 500, {
        ok: false,
        error: error instanceof Error ? error.message : "앱 폴더를 읽지 못했습니다.",
      });
    }
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, {
      ok: false,
      error: "지원하지 않는 API입니다.",
    });
    return true;
  }

  return false;
}

const port = parsePort();
const vite = await createViteServer({
  appType: "spa",
  server: {
    middlewareMode: true,
  },
});

const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) return;

  vite.middlewares(request, response, () => {
    sendJson(response, 404, {
      ok: false,
      error: "페이지를 찾지 못했습니다.",
    });
  });
});

server.listen(port, "localhost", () => {
  console.log(`iOS Release Assistant local server: http://localhost:${port}/`);
});
