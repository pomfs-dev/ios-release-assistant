import crypto from "node:crypto";

export const ASC_CONNECT_CONFIRMATION_TOKEN = "CONFIRM_ASC_CONNECT";
export const ASC_UPDATE_CONFIRMATION_TOKEN = "CONFIRM_ASC_UPDATE";

const APP_STORE_CONNECT_AUDIENCE = "appstoreconnect-v1";
const DEFAULT_BASE_URL = "https://api.appstoreconnect.apple.com";
const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;
const EDITABLE_APP_STORE_STATES = new Set([
  "DEVELOPER_REJECTED",
  "INVALID_BINARY",
  "METADATA_REJECTED",
  "PREPARE_FOR_SUBMISSION",
  "REJECTED",
  "WAITING_FOR_EXPORT_COMPLIANCE",
]);

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createJwt({ issuerId, keyId, privateKey, now, tokenTtlSeconds }) {
  const issuedAt = Math.floor(now() / 1000);
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const claims = {
    iss: issuerId,
    iat: issuedAt,
    exp: issuedAt + tokenTtlSeconds,
    aud: APP_STORE_CONNECT_AUDIENCE,
  };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(claims)}`;
  const signature = crypto.sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${signingInput}.${signature.toString("base64url")}`;
}

function createPrivateKey(privateKeyInput) {
  try {
    return crypto.createPrivateKey(privateKeyInput);
  } catch {
    throw httpError(".p8 private key를 읽지 못했습니다. App Store Connect API Key 파일 내용을 그대로 붙여넣어 주세요.");
  }
}

function normalizeAppResource(resource) {
  if (!resource?.id || !resource?.attributes) return null;
  const attributes = resource.attributes;

  return {
    id: String(resource.id),
    name: trimString(attributes.name) || null,
    bundleId: trimString(attributes.bundleId) || null,
    sku: trimString(attributes.sku) || null,
    primaryLocale: trimString(attributes.primaryLocale) || null,
  };
}

function appFromPayload(payload) {
  const resource = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const app = normalizeAppResource(resource);
  if (!app) throw httpError("App Store Connect에서 해당 앱을 찾지 못했습니다.", 404);
  return app;
}

function ascApiError(payload, statusCode) {
  const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  const detail = trimString(firstError?.detail) || trimString(firstError?.title);
  const message =
    statusCode === 401 || statusCode === 403
      ? "App Store Connect 인증에 실패했습니다. Issuer ID, Key ID, private key 권한을 확인해 주세요."
      : detail || "App Store Connect API 요청에 실패했습니다.";
  return httpError(message, statusCode);
}

function appPathForId(appAppleId) {
  return `/v1/apps/${encodeURIComponent(appAppleId)}?fields[apps]=name,bundleId,sku,primaryLocale`;
}

function appPathForBundleId(bundleId) {
  const query = new URLSearchParams({
    "filter[bundleId]": bundleId,
    "fields[apps]": "name,bundleId,sku,primaryLocale",
    limit: "1",
  });
  return `/v1/apps?${query.toString()}`;
}

function appInfosPath(appId) {
  const query = new URLSearchParams({
    include: "appInfoLocalizations",
    "fields[appInfos]": "appStoreState,state,appInfoLocalizations",
    "fields[appInfoLocalizations]":
      "locale,name,subtitle,privacyPolicyUrl,privacyChoicesUrl,privacyPolicyText",
    limit: "1",
  });
  return `/v1/apps/${encodeURIComponent(appId)}/appInfos?${query.toString()}`;
}

function appStoreVersionsPath(appId) {
  const query = new URLSearchParams({
    include: "appStoreVersionLocalizations",
    "fields[appStoreVersions]":
      "platform,versionString,appStoreState,appStoreVersionLocalizations",
    "fields[appStoreVersionLocalizations]":
      "locale,description,keywords,marketingUrl,promotionalText,supportUrl,whatsNew",
    limit: "20",
  });
  return `/v1/apps/${encodeURIComponent(appId)}/appStoreVersions?${query.toString()}`;
}

function includedResources(payload, type) {
  return (Array.isArray(payload?.included) ? payload.included : []).filter(
    (resource) => resource?.type === type,
  );
}

function resourceAttributes(resource) {
  return resource?.attributes && typeof resource.attributes === "object" ? resource.attributes : {};
}

function chooseLocalization(resources, preferredLocale) {
  if (resources.length === 0) return null;
  return (
    resources.find((resource) => resourceAttributes(resource).locale === preferredLocale) ??
    resources[0]
  );
}

function chooseEditableVersion(resources) {
  if (resources.length === 0) return null;
  return (
    resources.find((resource) =>
      EDITABLE_APP_STORE_STATES.has(resourceAttributes(resource).appStoreState),
    ) ?? resources[0]
  );
}

function textAnswer(answers, stepId, label) {
  const value = answers?.[stepId]?.[label];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function choiceAnswers(answers, stepId, label) {
  const value = answers?.[stepId]?.[label];
  return Array.isArray(value) ? value : [];
}

function metadataInput(input) {
  const answers = input?.answers ?? {};
  const storeMedia = choiceAnswers(answers, "store", "App Store 미디어 자산");
  const reviewAccess = choiceAnswers(answers, "store", "심사 접근 방식");

  return {
    appDescription:
      trimString(input?.appDescription) ||
      textAnswer(answers, "store", "App Store에 보일 앱 설명"),
    demoAccount:
      trimString(input?.demoAccount) || textAnswer(answers, "store", "심사용 데모 계정"),
    locale: trimString(input?.locale),
    privacyPolicyUrl:
      trimString(input?.privacyPolicyUrl) ||
      textAnswer(answers, "privacy", "개인정보 처리방침 주소"),
    reviewAccess,
    storeMedia,
  };
}

function addAscOperation(operations, operation) {
  if (!operation.proposedValue || operation.currentValue === operation.proposedValue) return;
  operations.push(operation);
}

function appInfoLocalizationPatch(operation) {
  return {
    data: {
      id: operation.resourceId,
      type: "appInfoLocalizations",
      attributes: {
        [operation.attribute]: operation.proposedValue,
      },
    },
  };
}

function appStoreVersionLocalizationPatch(operation) {
  return {
    data: {
      id: operation.resourceId,
      type: "appStoreVersionLocalizations",
      attributes: {
        [operation.attribute]: operation.proposedValue,
      },
    },
  };
}

export function createAppStoreConnectManager({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  sessionIdFactory = () => crypto.randomUUID(),
  tokenTtlSeconds = DEFAULT_TOKEN_TTL_SECONDS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("App Store Connect API를 호출할 fetch 구현이 필요합니다.");
  }

  let session = null;
  const updatePlans = new Map();

  async function requestJson(pathname, jwt, { body, method = "GET" } = {}) {
    const response = await fetchImpl(`${baseUrl}${pathname}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${jwt}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) throw ascApiError(payload, response.status);
    return payload;
  }

  async function fetchApp({ issuerId, keyId, privateKey, appAppleId, bundleId }) {
    const jwt = createJwt({ issuerId, keyId, privateKey, now, tokenTtlSeconds });

    if (appAppleId) {
      try {
        return {
          app: appFromPayload(await requestJson(appPathForId(appAppleId), jwt)),
          resolvedBy: "appAppleId",
        };
      } catch (error) {
        if (!bundleId || error.statusCode !== 404) throw error;
      }
    }

    if (!bundleId) throw httpError("Apple App ID 또는 Bundle ID가 필요합니다.");
    return {
      app: appFromPayload(await requestJson(appPathForBundleId(bundleId), jwt)),
      resolvedBy: "bundleId",
    };
  }

  function jwtForSession() {
    if (!session) throw httpError("먼저 App Store Connect 세션을 연결해야 합니다.", 409);
    return createJwt({
      issuerId: session.issuerId,
      keyId: session.keyId,
      privateKey: session.privateKey,
      now,
      tokenTtlSeconds,
    });
  }

  async function fetchEditableMetadata() {
    if (!session) throw httpError("먼저 App Store Connect 세션을 연결해야 합니다.", 409);

    const jwt = jwtForSession();
    const [appInfoPayload, versionPayload] = await Promise.all([
      requestJson(appInfosPath(session.app.id), jwt),
      requestJson(appStoreVersionsPath(session.app.id), jwt),
    ]);
    const locale = session.app.primaryLocale || "en-US";
    const appInfoLocalization = chooseLocalization(
      includedResources(appInfoPayload, "appInfoLocalizations"),
      locale,
    );
    const appStoreVersion = chooseEditableVersion(
      Array.isArray(versionPayload?.data) ? versionPayload.data : [],
    );
    const versionLocalization = chooseLocalization(
      includedResources(versionPayload, "appStoreVersionLocalizations"),
      locale,
    );

    return {
      appInfoLocalization,
      appStoreVersion,
      locale,
      versionLocalization,
    };
  }

  function createUpdatePlan({ input, metadata }) {
    if (!session) throw httpError("먼저 App Store Connect 세션을 연결해야 합니다.", 409);

    const planInput = metadataInput(input);
    const locale = planInput.locale || metadata.locale;
    const operations = [];
    const manualItems = [];

    if (planInput.privacyPolicyUrl) {
      if (!metadata.appInfoLocalization) {
        manualItems.push({
          id: "privacy-policy-url",
          title: "Privacy Policy URL",
          reason: "업데이트할 App Info localization을 찾지 못했습니다.",
        });
      } else {
        const attributes = resourceAttributes(metadata.appInfoLocalization);
        addAscOperation(operations, {
          id: "update-privacy-policy-url",
          kind: "update-app-info-localization",
          title: "Privacy Policy URL 업데이트",
          resourceId: metadata.appInfoLocalization.id,
          resourceType: "appInfoLocalizations",
          locale: attributes.locale || locale,
          attribute: "privacyPolicyUrl",
          currentValue: trimString(attributes.privacyPolicyUrl),
          proposedValue: planInput.privacyPolicyUrl,
        });
      }
    }

    if (planInput.appDescription) {
      if (!metadata.versionLocalization) {
        manualItems.push({
          id: "app-description",
          title: "App Store 상품 설명",
          reason: "업데이트할 App Store version localization을 찾지 못했습니다.",
        });
      } else {
        const attributes = resourceAttributes(metadata.versionLocalization);
        addAscOperation(operations, {
          id: "update-app-description",
          kind: "update-app-store-version-localization",
          title: "App Store 상품 설명 업데이트",
          resourceId: metadata.versionLocalization.id,
          resourceType: "appStoreVersionLocalizations",
          locale: attributes.locale || locale,
          appStoreVersionId: metadata.appStoreVersion?.id ?? null,
          appStoreState: resourceAttributes(metadata.appStoreVersion).appStoreState ?? null,
          attribute: "description",
          currentValue: trimString(attributes.description),
          proposedValue: planInput.appDescription,
        });
      }
    }

    if (planInput.demoAccount) {
      manualItems.push({
        id: "demo-account",
        title: "심사용 데모 계정",
        reason: "심사 계정/메모 자동 입력은 아직 지원하지 않습니다. App Store Connect 심사 정보에 직접 입력해야 합니다.",
      });
    }

    if (planInput.storeMedia.length > 0) {
      manualItems.push({
        id: "media-assets",
        title: "스크린샷 및 앱 미리보기",
        reason: "스크린샷과 앱 미리보기 업로드는 별도 asset reservation/upload flow가 필요해 현재는 준비 상태만 점검합니다.",
      });
    }

    const plan = {
      ok: true,
      id: `asc-plan-${crypto.randomUUID()}`,
      app: session.app,
      createdAt: new Date(now()).toISOString(),
      locale,
      operations,
      operationCount: operations.length,
      manualItems,
      confirmation: {
        update: ASC_UPDATE_CONFIRMATION_TOKEN,
      },
    };
    updatePlans.set(plan.id, plan);
    return plan;
  }

  async function applyUpdateOperation(operation, jwt) {
    if (operation.kind === "update-app-info-localization") {
      const payload = await requestJson(`/v1/appInfoLocalizations/${encodeURIComponent(operation.resourceId)}`, jwt, {
        method: "PATCH",
        body: appInfoLocalizationPatch(operation),
      });
      return {
        operationId: operation.id,
        ok: true,
        resourceId: operation.resourceId,
        resourceType: operation.resourceType,
        value: resourceAttributes(payload.data)[operation.attribute] ?? operation.proposedValue,
      };
    }

    if (operation.kind === "update-app-store-version-localization") {
      const payload = await requestJson(
        `/v1/appStoreVersionLocalizations/${encodeURIComponent(operation.resourceId)}`,
        jwt,
        {
          method: "PATCH",
          body: appStoreVersionLocalizationPatch(operation),
        },
      );
      return {
        operationId: operation.id,
        ok: true,
        resourceId: operation.resourceId,
        resourceType: operation.resourceType,
        value: resourceAttributes(payload.data)[operation.attribute] ?? operation.proposedValue,
      };
    }

    throw httpError(`지원하지 않는 App Store Connect 작업입니다: ${operation.kind}`, 400);
  }

  return {
    async connect(input, confirmationToken) {
      if (confirmationToken !== ASC_CONNECT_CONFIRMATION_TOKEN) {
        throw httpError("Apple 연결 승인 토큰이 올바르지 않습니다.", 403);
      }

      const issuerId = trimString(input?.issuerId);
      const keyId = trimString(input?.keyId);
      const appAppleId = trimString(input?.appAppleId);
      const bundleId = trimString(input?.bundleId);
      const privateKeyInput = trimString(input?.privateKeyInput);

      if (!issuerId || !keyId || !privateKeyInput || (!appAppleId && !bundleId)) {
        throw httpError("Issuer ID, Key ID, private key, 그리고 Apple App ID 또는 Bundle ID가 필요합니다.");
      }

      const privateKey = createPrivateKey(privateKeyInput);
      const { app, resolvedBy } = await fetchApp({
        issuerId,
        keyId,
        privateKey,
        appAppleId,
        bundleId,
      });
      const connectedAt = new Date(now()).toISOString();
      session = {
        app,
        appAppleId,
        bundleId: bundleId || app.bundleId || "",
        connectedAt,
        issuerId,
        keyId,
        privateKey,
        resolvedBy,
        sessionId: sessionIdFactory(),
      };

      return {
        ok: true,
        app,
        connectedAt,
        issuerId,
        keyId,
        resolvedBy,
        sessionId: session.sessionId,
      };
    },

    async read() {
      if (!session) throw httpError("먼저 App Store Connect 세션을 연결해야 합니다.", 409);
      const { app, resolvedBy } = await fetchApp(session);
      session = {
        ...session,
        app,
        resolvedBy,
      };

      return {
        ok: true,
        app,
        readAt: new Date(now()).toISOString(),
        sessionId: session.sessionId,
      };
    },

    async buildUpdatePlan(input = {}) {
      const metadata = await fetchEditableMetadata();
      return createUpdatePlan({ input, metadata });
    },

    getUpdatePlan(planId) {
      return updatePlans.get(planId) ?? null;
    },

    async updateDraft(planId, confirmationToken) {
      if (confirmationToken !== ASC_UPDATE_CONFIRMATION_TOKEN) {
        throw httpError("App Store Connect 업데이트 승인 토큰이 올바르지 않습니다.", 403);
      }

      const plan = updatePlans.get(planId);
      if (!plan) throw httpError("App Store Connect 업데이트 계획을 찾지 못했습니다.", 404);

      const jwt = jwtForSession();
      const results = [];
      for (const operation of plan.operations) {
        results.push(await applyUpdateOperation(operation, jwt));
      }

      return {
        ok: true,
        planId: plan.id,
        updatedAt: new Date(now()).toISOString(),
        operationCount: results.length,
        results,
        manualItems: plan.manualItems,
      };
    },

    clear() {
      session = null;
      updatePlans.clear();
    },
  };
}
