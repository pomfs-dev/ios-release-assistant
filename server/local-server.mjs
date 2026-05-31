import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createServer as createViteServer } from "vite";
import { getBridgeCapabilities } from "./bridge/capabilities.mjs";
import { createPairingManager, getPairingTokenFromRequest } from "./bridge/pairing.mjs";
import {
  createAllowedOriginAllowlist,
  getCorsHeaders,
  getEndpointPolicy,
  getPolicyForPreflight,
  getPreflightHeaders,
} from "./bridge/policy.mjs";
import { redactSecrets } from "./bridge/redaction.mjs";
import { createAppStoreConnectManager } from "./appStoreConnect.mjs";
import { createFilePicker } from "./filePicker.mjs";
import { createFolderBrowser } from "./folderBrowser.mjs";
import { generateXcodeProject } from "./generateProject.mjs";
import { scanFolder } from "./scanFolder.mjs";
import { createWritePlanManager } from "./writePlan.mjs";

const DEFAULT_PORT = 56604;
const DEFAULT_HOST = "127.0.0.1";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function parsePort() {
  const portFlagIndex = process.argv.indexOf("--port");
  const rawPort =
    portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : process.env.PORT ?? DEFAULT_PORT;
  const port = Number(rawPort);
  return Number.isFinite(port) ? port : DEFAULT_PORT;
}

function parseHost() {
  const host = process.env.HOST ?? DEFAULT_HOST;
  return LOOPBACK_HOSTS.has(host) ? host : DEFAULT_HOST;
}

function hmrPortFor(listenPort) {
  const candidate = listenPort + 1000;
  return candidate <= 65535 ? candidate : listenPort - 1000;
}

function sendJson(response, statusCode, payload, { headers = {}, redact = true } = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(redact ? redactSecrets(payload) : payload, null, 2));
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

function sendBridgeNotImplemented(response, policy, headers) {
  sendJson(
    response,
    501,
    {
      ok: false,
      error: "이 bridge endpoint는 아직 foundation 단계에서 정책만 정의되어 있습니다.",
      policy,
    },
    { headers },
  );
}

function validateRequiredApproval(policy, body) {
  if (policy.requiresPlanId && typeof body.planId !== "string") {
    return { ok: false, statusCode: 400, error: "plan id가 필요합니다." };
  }

  if (policy.requiresConfirmationToken && typeof body.confirmationToken !== "string") {
    return { ok: false, statusCode: 400, error: "confirmation token이 필요합니다." };
  }

  return { ok: true };
}

function createBridgeHandler({
  allowedOrigins,
  appStoreConnect,
  filePicker,
  folderBrowser,
  pairingManager,
  writePlanManager,
}) {
  return async function handleBridgeApi(request, response, url) {
    if (!url.pathname.startsWith("/api/bridge/")) return false;

    if (request.method === "OPTIONS") {
      const policy = getPolicyForPreflight(request, url.pathname);
      const cors = getPreflightHeaders(request, allowedOrigins);
      response.writeHead(policy && cors.allowed ? 204 : 403, cors.headers);
      response.end();
      return true;
    }

    const policy = getEndpointPolicy(request.method ?? "GET", url.pathname);
    if (!policy) {
      sendJson(response, 404, {
        ok: false,
        error: "지원하지 않는 bridge API입니다.",
      });
      return true;
    }

    const cors = getCorsHeaders(request, allowedOrigins);
    if (!cors.allowed) {
      sendJson(response, 403, {
        ok: false,
        error: "허용되지 않은 origin입니다.",
      });
      return true;
    }

    if (url.pathname === "/api/bridge/health" && request.method === "GET") {
      const pairingState = pairingManager.getPairingState();
      sendJson(
        response,
        200,
        {
          ok: true,
          bridge: getBridgeCapabilities({ paired: pairingState.paired }),
          pairing: pairingState,
        },
        { headers: cors.headers },
      );
      return true;
    }

    if (url.pathname === "/api/bridge/pair" && request.method === "POST") {
      const pairing = pairingManager.rotatePairingToken();
      sendJson(
        response,
        200,
        {
          ok: true,
          pairingToken: pairing.token,
          expiresAt: pairing.expiresAt,
          bridge: getBridgeCapabilities({ paired: true }),
        },
        { headers: cors.headers, redact: false },
      );
      return true;
    }

    const body = await readJsonBody(request);

    if (policy.requiresPairing) {
      const validation = pairingManager.validatePairingToken(
        getPairingTokenFromRequest(request, body),
      );

      if (!validation.ok) {
        sendJson(
          response,
          401,
          {
            ok: false,
            error: "bridge pairing token이 필요합니다.",
            reason: validation.reason,
          },
          { headers: cors.headers },
        );
        return true;
      }
    }

    const approval = validateRequiredApproval(policy, body);
    if (!approval.ok) {
      sendJson(
        response,
        approval.statusCode,
        {
          ok: false,
          error: approval.error,
        },
        { headers: cors.headers },
      );
      return true;
    }

    if (url.pathname === "/api/bridge/scan-folder" && request.method === "POST") {
      try {
        const result = await scanFolder(body.path);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "앱 폴더를 읽지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/browse-path" && request.method === "POST") {
      try {
        const result = await folderBrowser.browse(body.path);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "로컬 폴더를 탐색하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/select-folder" && request.method === "POST") {
      try {
        const result = await filePicker.selectFolder();
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            canceled: Boolean(error.canceled),
            error: error instanceof Error ? error.message : "앱 폴더를 선택하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/select-project-spec" && request.method === "POST") {
      try {
        const result = await filePicker.selectProjectSpec();
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            canceled: Boolean(error.canceled),
            error: error instanceof Error ? error.message : "project.yml 파일을 선택하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/select-screenshot" && request.method === "POST") {
      try {
        const result = await filePicker.selectScreenshot();
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            canceled: Boolean(error.canceled),
            error: error instanceof Error ? error.message : "스크린샷 파일을 선택하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/build-write-plan" && request.method === "POST") {
      try {
        const plan = await writePlanManager.buildAndStore(body.path, body.answers ?? {});
        sendJson(response, 200, plan, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "write plan을 만들지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/backup" && request.method === "POST") {
      try {
        const result = await writePlanManager.backup(body.planId, body.confirmationToken);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "백업을 만들지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/apply-write-plan" && request.method === "POST") {
      try {
        const result = await writePlanManager.apply(body.planId, body.confirmationToken);
        sendJson(response, result.ok ? 200 : 409, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "write plan을 적용하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/generate" && request.method === "POST") {
      try {
        const plan = writePlanManager.get(body.planId);
        if (!plan) {
          sendJson(response, 404, {
            ok: false,
            error: "generate에 사용할 write plan을 찾지 못했습니다.",
          }, { headers: cors.headers });
          return true;
        }

        const result = await generateXcodeProject(plan, body.confirmationToken);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          error.generateResult ?? {
            ok: false,
            error: error instanceof Error ? error.message : "xcodegen generate를 실행하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/asc/connect" && request.method === "POST") {
      try {
        const result = await appStoreConnect.connect(body, body.confirmationToken);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "App Store Connect에 연결하지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/asc/read" && request.method === "POST") {
      try {
        const result = await appStoreConnect.read();
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error: error instanceof Error ? error.message : "App Store Connect 앱 정보를 읽지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/asc/build-update-plan" && request.method === "POST") {
      try {
        const result = await appStoreConnect.buildUpdatePlan(body);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "App Store Connect 업데이트 계획을 만들지 못했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    if (url.pathname === "/api/bridge/asc/update-draft" && request.method === "POST") {
      try {
        const result = await appStoreConnect.updateDraft(body.planId, body.confirmationToken);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(
          response,
          error.statusCode ?? 500,
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "App Store Connect 초안 업데이트에 실패했습니다.",
          },
          { headers: cors.headers },
        );
      }
      return true;
    }

    sendBridgeNotImplemented(response, policy, cors.headers);
    return true;
  };
}

export function createApiHandler({
  allowedOrigins = createAllowedOriginAllowlist(DEFAULT_PORT),
  appStoreConnect = createAppStoreConnectManager(),
  filePicker = createFilePicker(),
  folderBrowser = createFolderBrowser(),
  pairingManager = createPairingManager(),
  writePlanManager = createWritePlanManager(),
} = {}) {
  const handleBridgeApi = createBridgeHandler({
    allowedOrigins,
    appStoreConnect,
    filePicker,
    folderBrowser,
    pairingManager,
    writePlanManager,
  });

  return async function handleApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (await handleBridgeApi(request, response, url)) return true;

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
      const cors = getCorsHeaders(request, allowedOrigins);
      if (!cors.allowed) {
        sendJson(response, 403, {
          ok: false,
          error: "허용되지 않은 origin입니다.",
        });
        return true;
      }

      sendJson(response, 200, {
        ok: true,
        mode: "local",
        message: "iOS Release Assistant local server is running.",
      }, { headers: cors.headers });
      return true;
    }

    if (url.pathname === "/api/scan-folder" && request.method === "POST") {
      const cors = getCorsHeaders(request, allowedOrigins);
      if (!cors.allowed) {
        sendJson(response, 403, {
          ok: false,
          error: "허용되지 않은 origin입니다.",
        });
        return true;
      }

      try {
        const body = await readJsonBody(request);
        const result = await scanFolder(body.path);
        sendJson(response, 200, result, { headers: cors.headers });
      } catch (error) {
        sendJson(response, error.statusCode ?? 500, {
          ok: false,
          error: error instanceof Error ? error.message : "앱 폴더를 읽지 못했습니다.",
        }, { headers: cors.headers });
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
  };
}

const port = parsePort();
const host = parseHost();

export async function startLocalServer({ listenPort = port, listenHost = host } = {}) {
  const vite = await createViteServer({
    appType: "spa",
    server: {
      hmr: {
        host: listenHost,
        port: hmrPortFor(listenPort),
      },
      middlewareMode: true,
    },
  });
  const handleApi = createApiHandler({
    allowedOrigins: createAllowedOriginAllowlist(listenPort),
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

  server.listen(listenPort, listenHost, () => {
    console.log(`iOS Release Assistant local server: http://${listenHost}:${listenPort}/`);
  });

  return { server, vite };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startLocalServer();
}
