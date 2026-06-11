import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { chmod, cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createAppStoreConnectManager } from "../appStoreConnect.mjs";
import { createFolderBrowser } from "../folderBrowser.mjs";
import { createApiHandler } from "../local-server.mjs";
import { createPairingManager } from "./pairing.mjs";
import { redactSecrets } from "./redaction.mjs";

const fixturePath = fileURLToPath(
  new URL("../../src/test/fixtures/complete-xcodegen-app", import.meta.url),
);

let activeServer = null;
let activeTempDir = null;

async function createTestServer(options = {}) {
  const handler = createApiHandler({
    allowedOrigins: new Set(["http://127.0.0.1:56604"]),
    ...options,
    pairingManager: createPairingManager({ ttlMs: 60_000 }),
  });

  const server = createServer(async (request, response) => {
    const handled = await handler(request, response);
    if (!handled) {
      response.writeHead(404);
      response.end();
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  activeServer = server;

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function readJson(response) {
  return response.json();
}

afterEach(async () => {
  delete process.env.XCODEGEN_BIN;

  if (activeServer) {
    await new Promise((resolve) => activeServer.close(resolve));
    activeServer = null;
  }

  if (activeTempDir) {
    await rm(activeTempDir, { force: true, recursive: true });
    activeTempDir = null;
  }
});

async function copyFixtureApp() {
  activeTempDir = await mkdtemp(path.join(os.tmpdir(), "ios-release-assistant-test-"));
  const appPath = path.join(activeTempDir, "complete-xcodegen-app");
  await cp(fixturePath, appPath, { recursive: true });
  return appPath;
}

async function pairBridge(baseUrl, headers = {}) {
  const challengeResponse = await fetch(`${baseUrl}/api/bridge/pairing/challenge`, {
    method: "POST",
    headers,
  });
  const challenge = await readJson(challengeResponse);
  expect(challengeResponse.status).toBe(200);
  expect(challenge.pairingToken).toBeUndefined();

  const confirmResponse = await fetch(`${baseUrl}/api/bridge/pairing/confirm`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      pairingCode: challenge.pairingCode,
    }),
  });
  const pairing = await readJson(confirmResponse);
  expect(confirmResponse.status).toBe(200);
  expect(pairing.pairingToken).toEqual(expect.any(String));
  return pairing;
}

async function createApproval(baseUrl, headers, action, planId) {
  const response = await fetch(`${baseUrl}/api/bridge/approvals`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action,
      ...(planId ? { planId } : {}),
    }),
  });
  const approval = await readJson(response);
  expect(response.status).toBe(200);
  expect(approval.approvalToken).toEqual(expect.any(String));
  return approval;
}

describe("bridge API foundation", () => {
  it("serves bridge health without a pairing token", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/health`);
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      bridge: {
        mode: "local-bridge",
        loopbackOnly: true,
      },
    });
  });

  it("returns only pairing metadata from the challenge endpoint", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/pairing/challenge`, { method: "POST" });
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.challengeId).toEqual(expect.any(String));
    expect(payload.pairingCode).toEqual(expect.any(String));
    expect(payload.pairingToken).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("project.yml");
  });

  it("does not issue tokens from the deprecated pair endpoint", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/pair`, {
      method: "POST",
    });
    const payload = await readJson(response);

    expect(response.status).toBe(410);
    expect(payload.ok).toBe(false);
    expect(payload.pairingToken).toBeUndefined();
  });

  it("rejects loopback browser proxy origins outside the explicit allowlist", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/pairing/challenge`, {
      method: "POST",
      headers: {
        origin: "http://localhost:51095",
      },
    });
    const payload = await readJson(response);

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("pins pairing tokens to their confirmed origin", async () => {
    const allowedOrigin = "http://127.0.0.1:56604";
    const baseUrl = await createTestServer();
    const pairing = await pairBridge(baseUrl, { origin: allowedOrigin });

    const response = await fetch(`${baseUrl}/api/bridge/scan-folder`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${pairing.pairingToken}`,
        "content-type": "application/json",
        origin: "http://localhost:56604",
      },
      body: JSON.stringify({ path: fixturePath }),
    });
    const payload = await readJson(response);

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: "허용되지 않은 origin입니다.",
    });
  });

  it("rejects bridge scan requests without a pairing token", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/scan-folder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: fixturePath }),
    });
    const payload = await readJson(response);

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      reason: "missing-pairing",
    });
  });

  it("retire legacy scan endpoint without returning project data", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/scan-folder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: fixturePath }),
    });
    const payload = await readJson(response);

    expect(response.status).toBe(410);
    expect(payload.ok).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("FixtureApp");
    expect(JSON.stringify(payload)).not.toContain("project.yml");
  });

  it("rejects local picker requests without a pairing token", async () => {
    const baseUrl = await createTestServer();
    const response = await fetch(`${baseUrl}/api/bridge/select-folder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await readJson(response);

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      reason: "missing-pairing",
    });
  });

  it("browses allowed local folders after pairing", async () => {
    const baseUrl = await createTestServer({
      folderBrowser: createFolderBrowser({ roots: [path.dirname(fixturePath)] }),
    });
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const rootResponse = await fetch(`${baseUrl}/api/bridge/browse-path`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const rootListing = await readJson(rootResponse);

    expect(rootResponse.status).toBe(200);
    expect(rootListing.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "complete-xcodegen-app",
          kind: "directory",
          selectable: true,
          hasProjectSpec: true,
        }),
      ]),
    );

    const appResponse = await fetch(`${baseUrl}/api/bridge/browse-path`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: fixturePath }),
    });
    const appListing = await readJson(appResponse);

    expect(appResponse.status).toBe(200);
    expect(appListing.current.path).toBe(fixturePath);
    expect(appListing.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "project.yml",
          kind: "project-spec",
          selectable: true,
        }),
      ]),
    );

    const outsideResponse = await fetch(`${baseUrl}/api/bridge/browse-path`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: os.tmpdir() }),
    });
    expect(outsideResponse.status).toBe(403);
  });

  it("returns selected local paths from the picker endpoints after pairing", async () => {
    const baseUrl = await createTestServer({
      filePicker: {
        selectFolder: async () => ({ ok: true, path: fixturePath, kind: "folder" }),
        selectProjectSpec: async () => ({
          ok: true,
          path: path.join(fixturePath, "project.yml"),
          kind: "project-spec",
        }),
        selectScreenshot: async () => ({
          ok: true,
          path: path.join(fixturePath, "screenshots", "iphone-home.png"),
          kind: "screenshot",
          name: "iphone-home.png",
          relativePath: path.join(fixturePath, "screenshots", "iphone-home.png"),
          absolutePath: path.join(fixturePath, "screenshots", "iphone-home.png"),
          source: "local-image",
          previewDataUrl: "data:image/png;base64,ZmFrZS1zY3JlZW4=",
        }),
      },
    });
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const folderResponse = await fetch(`${baseUrl}/api/bridge/select-folder`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const folder = await readJson(folderResponse);

    const specResponse = await fetch(`${baseUrl}/api/bridge/select-project-spec`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const spec = await readJson(specResponse);
    const screenshotResponse = await fetch(`${baseUrl}/api/bridge/select-screenshot`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const screenshot = await readJson(screenshotResponse);

    expect(folderResponse.status).toBe(200);
    expect(folder).toEqual({ ok: true, path: fixturePath, kind: "folder" });
    expect(specResponse.status).toBe(200);
    expect(spec).toEqual({
      ok: true,
      path: path.join(fixturePath, "project.yml"),
      kind: "project-spec",
    });
    expect(screenshotResponse.status).toBe(200);
    expect(screenshot).toMatchObject({
      ok: true,
      kind: "screenshot",
      name: "iphone-home.png",
      previewDataUrl: "data:image/png;base64,ZmFrZS1zY3JlZW4=",
    });
  });

  it("reports picker cancellation without returning project data", async () => {
    const canceledError = new Error("선택이 취소됐습니다.");
    canceledError.statusCode = 499;
    canceledError.canceled = true;
    const baseUrl = await createTestServer({
      filePicker: {
        selectFolder: async () => {
          throw canceledError;
        },
        selectProjectSpec: async () => ({ ok: true, path: "unused", kind: "project-spec" }),
      },
    });
    const pairing = await pairBridge(baseUrl);

    const response = await fetch(`${baseUrl}/api/bridge/select-folder`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${pairing.pairingToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const payload = await readJson(response);

    expect(response.status).toBe(499);
    expect(payload).toMatchObject({
      ok: false,
      canceled: true,
      error: "선택이 취소됐습니다.",
    });
    expect(JSON.stringify(payload)).not.toContain("project.yml");
  });

  it("scans a local fixture folder after pairing", async () => {
    const baseUrl = await createTestServer();
    const pairing = await pairBridge(baseUrl);

    const scanResponse = await fetch(`${baseUrl}/api/bridge/scan-folder`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${pairing.pairingToken}`,
      },
      body: JSON.stringify({ path: fixturePath }),
    });
    const scan = await readJson(scanResponse);

    expect(scanResponse.status).toBe(200);
    expect(scan).toMatchObject({
      ok: true,
      project: {
        name: "FixtureApp",
      },
    });
    expect(scan.files.infoPlists[0].parsed.privacyKeys[0]).toMatchObject({
      key: "NSCameraUsageDescription",
    });
    expect(scan.files.entitlements[0].parsed.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "com.apple.developer.applesignin" }),
      ]),
    );
    expect(scan.files.appIconSets[0]).toMatchObject({
      relativePath: "FixtureApp/Assets.xcassets/AppIcon.appiconset",
      parsed: {
        hasMarketingIcon: true,
        marketingIcon: {
          filename: "AppStoreIcon.png",
          size: "1024x1024",
        },
      },
    });
  });

  it("accepts a direct XcodeGen project file path after pairing", async () => {
    const baseUrl = await createTestServer();
    const pairing = await pairBridge(baseUrl);

    const scanResponse = await fetch(`${baseUrl}/api/bridge/scan-folder`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${pairing.pairingToken}`,
      },
      body: JSON.stringify({ path: path.join(fixturePath, "project.yml") }),
    });
    const scan = await readJson(scanResponse);

    expect(scanResponse.status).toBe(200);
    expect(scan).toMatchObject({
      ok: true,
      folder: {
        path: fixturePath,
      },
      files: {
        projectSpec: {
          relativePath: "project.yml",
        },
      },
      project: {
        name: "FixtureApp",
      },
    });
  });

  it("redacts secret-shaped fields and private key text", () => {
    const redacted = redactSecrets({
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
      apiKey: "abc123",
      nested: {
        token: "secret-token",
        safe: "public value",
      },
    });

    expect(redacted).toEqual({
      privateKey: "[REDACTED]",
      apiKey: "[REDACTED]",
      nested: {
        token: "[REDACTED]",
        safe: "public value",
      },
    });
  });

  it("builds a write plan, creates a backup, applies structured writes, and rescans", async () => {
    const appPath = await copyFixtureApp();
    const baseUrl = await createTestServer();
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const planResponse = await fetch(`${baseUrl}/api/bridge/build-write-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        path: appPath,
        answers: {
          basic: {
            "앱 이름": "Shipped Fixture",
            "앱 고유 주소": "com.example.shipped",
          },
          signing: {
            "Apple 개발자 팀 ID": "TEAM999999",
          },
          privacy: {
            "카메라 권한 문구": "배송 전 카메라 설명을 확인합니다.",
          },
          capabilities: {
            "capabilities.choices.0": ["Apple 로그인 사용", "웹사이트 링크 연결"],
            "앱과 연결할 웹사이트 주소": "applinks:release.example.com",
          },
        },
      }),
    });
    const plan = await readJson(planResponse);

    expect(planResponse.status).toBe(200);
    expect(plan.operations.map((operation) => operation.kind)).toEqual([
      "update-project-yml",
      "update-info-plist",
      "update-entitlements",
    ]);

    const rejectedBackupResponse = await fetch(`${baseUrl}/api/bridge/backup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ planId: plan.id }),
    });
    const rejectedBackup = await readJson(rejectedBackupResponse);
    expect(rejectedBackupResponse.status).toBe(403);
    expect(rejectedBackup.reason).toBe("missing-approval");

    const backupApproval = await createApproval(baseUrl, headers, "backup", plan.id);

    const backupResponse = await fetch(`${baseUrl}/api/bridge/backup`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planId: plan.id,
        approvalToken: backupApproval.approvalToken,
      }),
    });
    const backup = await readJson(backupResponse);

    expect(backupResponse.status).toBe(200);
    expect(backup.manifest.files).toHaveLength(3);
    expect(backup.manifest.writePlanId).toBe(plan.id);

    const replayedBackupResponse = await fetch(`${baseUrl}/api/bridge/backup`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planId: plan.id,
        approvalToken: backupApproval.approvalToken,
      }),
    });
    const replayedBackup = await readJson(replayedBackupResponse);
    expect(replayedBackupResponse.status).toBe(403);
    expect(replayedBackup.reason).toBe("invalid-approval");

    const applyApproval = await createApproval(baseUrl, headers, "apply-write-plan", plan.id);
    const applyResponse = await fetch(`${baseUrl}/api/bridge/apply-write-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planId: plan.id,
        approvalToken: applyApproval.approvalToken,
      }),
    });
    const applied = await readJson(applyResponse);

    expect(applyResponse.status).toBe(200);
    expect(applied.ok).toBe(true);
    expect(applied.verification.every((item) => item.ok)).toBe(true);
    expect(applied.scanResult.project.targets[0]).toMatchObject({
      productName: "Shipped Fixture",
      bundleId: "com.example.shipped",
      developmentTeam: "TEAM999999",
    });
    expect(applied.scanResult.files.infoPlists[0].parsed).toMatchObject({
      bundleDisplayName: "Shipped Fixture",
      bundleIdentifier: "com.example.shipped",
    });
    expect(applied.scanResult.files.infoPlists[0].parsed.privacyKeys[0]).toMatchObject({
      value: "배송 전 카메라 설명을 확인합니다.",
    });
    expect(applied.scanResult.files.entitlements[0].parsed.associatedDomains).toEqual([
      "applinks:release.example.com",
    ]);
  });

  it("runs xcodegen generate through the paired bridge with a generate backup", async () => {
    const appPath = await copyFixtureApp();
    const fakeXcodegen = path.join(activeTempDir, "fake-xcodegen");
    await writeFile(
      fakeXcodegen,
      "#!/bin/sh\nprintf 'fake xcodegen %s\\n' \"$*\"\nmkdir -p FixtureApp.xcodeproj\ntouch FixtureApp.xcodeproj/generated-by-test\n",
      "utf8",
    );
    await chmod(fakeXcodegen, 0o755);
    process.env.XCODEGEN_BIN = fakeXcodegen;

    const baseUrl = await createTestServer();
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const planResponse = await fetch(`${baseUrl}/api/bridge/build-write-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: appPath, answers: {} }),
    });
    const plan = await readJson(planResponse);
    expect(plan.operationCount).toBe(0);

    const rejectedGenerateResponse = await fetch(`${baseUrl}/api/bridge/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ planId: plan.id }),
    });
    const rejectedGenerate = await readJson(rejectedGenerateResponse);
    expect(rejectedGenerateResponse.status).toBe(403);
    expect(rejectedGenerate.reason).toBe("missing-approval");

    const mismatchedApproval = await createApproval(baseUrl, headers, "backup", plan.id);
    const mismatchedGenerateResponse = await fetch(`${baseUrl}/api/bridge/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ planId: plan.id, approvalToken: mismatchedApproval.approvalToken }),
    });
    const mismatchedGenerate = await readJson(mismatchedGenerateResponse);
    expect(mismatchedGenerateResponse.status).toBe(403);
    expect(mismatchedGenerate.reason).toBe("action-mismatch");

    const generateApproval = await createApproval(baseUrl, headers, "generate", plan.id);

    const generateResponse = await fetch(`${baseUrl}/api/bridge/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planId: plan.id,
        approvalToken: generateApproval.approvalToken,
      }),
    });
    const generated = await readJson(generateResponse);

    expect(generateResponse.status).toBe(200);
    expect(generated).toMatchObject({
      ok: true,
      writePlanId: plan.id,
      backup: {
        purpose: "xcodegen-generate",
      },
    });
    expect(generated.stdout).toContain("fake xcodegen generate --spec project.yml");
    expect(generated.backup.files.map((file) => file.relativePath)).toEqual(
      expect.arrayContaining(["project.yml", "FixtureApp.xcodeproj"]),
    );
  });

  it("connects to App Store Connect through the bridge without echoing the private key", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const privateKeyInput = privateKey.export({ format: "pem", type: "pkcs8" });
    const requests = [];
    const appStoreConnect = createAppStoreConnectManager({
      now: () => Date.parse("2026-05-31T00:00:00.000Z"),
      sessionIdFactory: () => "asc-session-test",
      fetchImpl: async (url, init) => {
        requests.push({ url, authorization: init.headers.authorization });
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "1234567890",
                type: "apps",
                attributes: {
                  name: "Fixture Store App",
                  bundleId: "com.example.fixture",
                  sku: "FIXTURE",
                  primaryLocale: "ko-KR",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });
    const baseUrl = await createTestServer({ appStoreConnect });
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const connectResponse = await fetch(`${baseUrl}/api/bridge/asc/connect`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        issuerId: "issuer-id",
        keyId: "KEY1234567",
        bundleId: "com.example.fixture",
        privateKeyInput,
      }),
    });
    const connected = await readJson(connectResponse);

    expect(connectResponse.status).toBe(200);
    expect(connected).toMatchObject({
      ok: true,
      resolvedBy: "bundleId",
      sessionId: "asc-session-test",
      app: {
        id: "1234567890",
        name: "Fixture Store App",
        bundleId: "com.example.fixture",
      },
    });
    expect(JSON.stringify(connected)).not.toContain("BEGIN PRIVATE KEY");
    expect(requests[0].url).toContain("/v1/apps?");
    expect(requests[0].url).toContain("filter%5BbundleId%5D=com.example.fixture");

    const token = requests[0].authorization.replace("Bearer ", "");
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    expect(signaturePart).toBeTruthy();
    expect(JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"))).toMatchObject({
      alg: "ES256",
      kid: "KEY1234567",
    });
    expect(JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"))).toMatchObject({
      aud: "appstoreconnect-v1",
      iss: "issuer-id",
    });

    const readResponse = await fetch(`${baseUrl}/api/bridge/asc/read`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const read = await readJson(readResponse);

    expect(readResponse.status).toBe(200);
    expect(read).toMatchObject({
      ok: true,
      sessionId: "asc-session-test",
      app: {
        bundleId: "com.example.fixture",
      },
    });
  });

  it("builds and applies an App Store Connect draft metadata update plan", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const privateKeyInput = privateKey.export({ format: "pem", type: "pkcs8" });
    const requests = [];
    const appStoreConnect = createAppStoreConnectManager({
      now: () => Date.parse("2026-05-31T00:00:00.000Z"),
      sessionIdFactory: () => "asc-session-update-test",
      fetchImpl: async (url, init) => {
        const parsedUrl = new URL(url);
        const body = init.body ? JSON.parse(init.body) : null;
        requests.push({ method: init.method, pathname: parsedUrl.pathname, body });

        if (parsedUrl.pathname === "/v1/apps" && init.method === "GET") {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "1234567890",
                  type: "apps",
                  attributes: {
                    name: "Fixture Store App",
                    bundleId: "com.example.fixture",
                    sku: "FIXTURE",
                    primaryLocale: "ko-KR",
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (parsedUrl.pathname === "/v1/apps/1234567890/appInfos" && init.method === "GET") {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "app-info-1",
                  type: "appInfos",
                  attributes: {
                    appStoreState: "PREPARE_FOR_SUBMISSION",
                  },
                },
              ],
              included: [
                {
                  id: "app-info-loc-1",
                  type: "appInfoLocalizations",
                  attributes: {
                    locale: "ko-KR",
                    privacyPolicyUrl: "https://old.example/privacy",
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (
          parsedUrl.pathname === "/v1/apps/1234567890/appStoreVersions" &&
          init.method === "GET"
        ) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "version-1",
                  type: "appStoreVersions",
                  attributes: {
                    platform: "IOS",
                    versionString: "1.0",
                    appStoreState: "PREPARE_FOR_SUBMISSION",
                  },
                },
              ],
              included: [
                {
                  id: "version-loc-1",
                  type: "appStoreVersionLocalizations",
                  attributes: {
                    locale: "ko-KR",
                    description: "Old description",
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (
          parsedUrl.pathname === "/v1/appInfoLocalizations/app-info-loc-1" &&
          init.method === "PATCH"
        ) {
          return new Response(
            JSON.stringify({
              data: {
                id: "app-info-loc-1",
                type: "appInfoLocalizations",
                attributes: {
                  privacyPolicyUrl: body.data.attributes.privacyPolicyUrl,
                },
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (
          parsedUrl.pathname === "/v1/appStoreVersionLocalizations/version-loc-1" &&
          init.method === "PATCH"
        ) {
          return new Response(
            JSON.stringify({
              data: {
                id: "version-loc-1",
                type: "appStoreVersionLocalizations",
                attributes: {
                  description: body.data.attributes.description,
                },
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ errors: [{ detail: "unexpected request" }] }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      },
    });
    const baseUrl = await createTestServer({ appStoreConnect });
    const pairing = await pairBridge(baseUrl);
    const headers = {
      authorization: `Bearer ${pairing.pairingToken}`,
      "content-type": "application/json",
    };

    const connectResponse = await fetch(`${baseUrl}/api/bridge/asc/connect`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        issuerId: "issuer-id",
        keyId: "KEY1234567",
        bundleId: "com.example.fixture",
        privateKeyInput,
      }),
    });
    expect(connectResponse.status).toBe(200);

    const planResponse = await fetch(`${baseUrl}/api/bridge/asc/build-update-plan`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        answers: {
          privacy: {
            "개인정보 처리방침 주소": "https://new.example/privacy",
          },
          store: {
            "App Store에 보일 앱 설명": "New App Store description",
            "심사용 데모 계정": "review@example.com / password",
            "App Store 미디어 자산": ["스크린샷 준비 완료"],
          },
        },
      }),
    });
    const plan = await readJson(planResponse);

    expect(planResponse.status).toBe(200);
    expect(plan).toMatchObject({
      ok: true,
      locale: "ko-KR",
      operationCount: 2,
      operations: [
        expect.objectContaining({
          kind: "update-app-info-localization",
          resourceId: "app-info-loc-1",
          attribute: "privacyPolicyUrl",
          proposedValue: "https://new.example/privacy",
        }),
        expect.objectContaining({
          kind: "update-app-store-version-localization",
          resourceId: "version-loc-1",
          attribute: "description",
          proposedValue: "New App Store description",
        }),
      ],
    });
    expect(plan.manualItems.map((item) => item.id)).toEqual(["demo-account", "media-assets"]);
    expect(JSON.stringify(plan)).not.toContain("BEGIN PRIVATE KEY");

    const rejectedUpdate = await fetch(`${baseUrl}/api/bridge/asc/update-draft`, {
      method: "POST",
      headers,
      body: JSON.stringify({ planId: plan.id }),
    });
    const rejectedUpdatePayload = await readJson(rejectedUpdate);
    expect(rejectedUpdate.status).toBe(403);
    expect(rejectedUpdatePayload.reason).toBe("missing-approval");

    const updateApproval = await createApproval(baseUrl, headers, "asc-update-draft", plan.id);

    const updateResponse = await fetch(`${baseUrl}/api/bridge/asc/update-draft`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        planId: plan.id,
        approvalToken: updateApproval.approvalToken,
      }),
    });
    const updated = await readJson(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updated).toMatchObject({
      ok: true,
      planId: plan.id,
      operationCount: 2,
      results: [
        expect.objectContaining({
          operationId: "update-privacy-policy-url",
          value: "https://new.example/privacy",
        }),
        expect.objectContaining({
          operationId: "update-app-description",
          value: "New App Store description",
        }),
      ],
    });
    expect(
      requests.filter((request) => request.method === "PATCH").map((request) => request.pathname),
    ).toEqual([
      "/v1/appInfoLocalizations/app-info-loc-1",
      "/v1/appStoreVersionLocalizations/version-loc-1",
    ]);
  });
});
