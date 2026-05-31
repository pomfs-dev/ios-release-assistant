import type {
  ApplyWritePlanResult,
  AppStoreConnectConnectionResult,
  AppStoreConnectReadResult,
  AppStoreConnectUpdatePlan,
  AppStoreConnectUpdateResult,
  AppleCredentialDraft,
  BackupResult,
  GenerateProjectResult,
  LocalPathSelection,
  LocalScreenshotSelection,
  ServerBrowserListing,
  UserAnswerState,
  WritePlan,
} from "../types";

const BACKUP_CONFIRMATION_TOKEN = "CONFIRM_BACKUP";
const WRITE_CONFIRMATION_TOKEN = "CONFIRM_WRITE";
const GENERATE_CONFIRMATION_TOKEN = "CONFIRM_GENERATE";
const ASC_CONNECT_CONFIRMATION_TOKEN = "CONFIRM_ASC_CONNECT";
const ASC_UPDATE_CONFIRMATION_TOKEN = "CONFIRM_ASC_UPDATE";
const BRIDGE_TIMEOUT_MS = 18_000;
const GENERATE_TIMEOUT_MS = 180_000;

let pairingToken: string | null = null;

export class BridgeRequestError extends Error {
  canceled: boolean;
  status: number;

  constructor(message: string, { canceled = false, status = 0 } = {}) {
    super(message);
    this.name = "BridgeRequestError";
    this.canceled = canceled;
    this.status = status;
  }
}

async function readPayload(response: Response) {
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new BridgeRequestError(payload.error ?? "local bridge 요청이 실패했습니다.", {
      canceled: Boolean(payload.canceled),
      status: response.status,
    });
  }

  return payload;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new BridgeRequestError(
        "local bridge 응답 시간이 초과됐습니다. 선택창이 보이지 않으면 전체 경로를 입력하고 Enter를 눌러주세요.",
        {
          status: 504,
        },
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function pairBridge() {
  if (pairingToken) return pairingToken;

  const response = await fetch("/api/bridge/pair", { method: "POST" });
  const payload = await readPayload(response);
  pairingToken = payload.pairingToken;
  return pairingToken;
}

async function bridgePost<TPayload>(
  path: string,
  body: Record<string, unknown>,
  retryOnPairingFailure = true,
  timeoutMs = BRIDGE_TIMEOUT_MS,
): Promise<TPayload> {
  const token = await pairBridge();
  const response = await fetchWithTimeout(path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, timeoutMs);

  try {
    return (await readPayload(response)) as TPayload;
  } catch (error) {
    if (
      retryOnPairingFailure &&
      error instanceof BridgeRequestError &&
      error.status === 401
    ) {
      pairingToken = null;
      return bridgePost<TPayload>(path, body, false, timeoutMs);
    }

    throw error;
  }
}

export function buildWritePlan(path: string, answers: UserAnswerState) {
  return bridgePost<WritePlan>("/api/bridge/build-write-plan", { path, answers });
}

export function selectFolder() {
  return bridgePost<LocalPathSelection>("/api/bridge/select-folder", {});
}

export function selectProjectSpec() {
  return bridgePost<LocalPathSelection>("/api/bridge/select-project-spec", {});
}

export function selectScreenshot() {
  return bridgePost<LocalScreenshotSelection>("/api/bridge/select-screenshot", {});
}

export function browseServerPath(path?: string) {
  return bridgePost<ServerBrowserListing>("/api/bridge/browse-path", { path });
}

export function backupWritePlan(plan: WritePlan) {
  return bridgePost<BackupResult>("/api/bridge/backup", {
    planId: plan.id,
    confirmationToken: BACKUP_CONFIRMATION_TOKEN,
  });
}

export function applyWritePlan(plan: WritePlan) {
  return bridgePost<ApplyWritePlanResult>("/api/bridge/apply-write-plan", {
    planId: plan.id,
    confirmationToken: WRITE_CONFIRMATION_TOKEN,
  });
}

export function generateProject(plan: WritePlan) {
  return bridgePost<GenerateProjectResult>("/api/bridge/generate", {
    planId: plan.id,
    confirmationToken: GENERATE_CONFIRMATION_TOKEN,
  }, false, GENERATE_TIMEOUT_MS);
}

export function connectAppStoreConnect(draft: AppleCredentialDraft) {
  return bridgePost<AppStoreConnectConnectionResult>("/api/bridge/asc/connect", {
    issuerId: draft.issuerId,
    keyId: draft.keyId,
    appAppleId: draft.appAppleId,
    bundleId: draft.bundleId,
    privateKeyInput: draft.privateKeyInput,
    confirmationToken: ASC_CONNECT_CONFIRMATION_TOKEN,
  });
}

export function readAppStoreConnect() {
  return bridgePost<AppStoreConnectReadResult>("/api/bridge/asc/read", {});
}

export function buildAppStoreConnectUpdatePlan(answers: UserAnswerState) {
  return bridgePost<AppStoreConnectUpdatePlan>("/api/bridge/asc/build-update-plan", { answers });
}

export function updateAppStoreConnectDraft(plan: AppStoreConnectUpdatePlan) {
  return bridgePost<AppStoreConnectUpdateResult>("/api/bridge/asc/update-draft", {
    planId: plan.id,
    confirmationToken: ASC_UPDATE_CONFIRMATION_TOKEN,
  });
}
