const BRIDGE_HEADER_ALLOWLIST =
  "content-type, authorization, x-ios-release-assistant-pairing-token, x-ios-release-assistant-approval-token";

export const ENDPOINT_POLICIES = [
  {
    method: "GET",
    path: "/api/bridge/health",
    access: "public",
    requiresPairing: false,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/pair",
    access: "deprecated",
    requiresPairing: false,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
    returnsProjectData: false,
  },
  {
    method: "POST",
    path: "/api/bridge/pairing/challenge",
    access: "pairing",
    requiresPairing: false,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
    returnsProjectData: false,
  },
  {
    method: "POST",
    path: "/api/bridge/pairing/confirm",
    access: "pairing",
    requiresPairing: false,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
    returnsProjectData: false,
  },
  {
    method: "POST",
    path: "/api/bridge/approvals",
    access: "paired-approval",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/scan-folder",
    access: "paired-project-data",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/browse-path",
    access: "paired-local-file-browser",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/select-folder",
    access: "paired-local-file-picker",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/select-project-spec",
    access: "paired-local-file-picker",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/select-screenshot",
    access: "paired-local-file-picker",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/build-write-plan",
    access: "paired-planning",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/backup",
    access: "paired-mutation",
    requiresPairing: true,
    requiresPlanId: true,
    requiresApproval: true,
    approvalAction: "backup",
    mutation: true,
  },
  {
    method: "POST",
    path: "/api/bridge/apply-write-plan",
    access: "paired-mutation",
    requiresPairing: true,
    requiresPlanId: true,
    requiresApproval: true,
    approvalAction: "apply-write-plan",
    mutation: true,
  },
  {
    method: "POST",
    path: "/api/bridge/generate",
    access: "paired-mutation",
    requiresPairing: true,
    requiresPlanId: true,
    requiresApproval: true,
    approvalAction: "generate",
    mutation: true,
  },
  {
    method: "POST",
    path: "/api/bridge/asc/connect",
    access: "paired-sensitive-session",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
    sessionMemoryOnly: true,
  },
  {
    method: "POST",
    path: "/api/bridge/asc/read",
    access: "paired-project-data",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/asc/build-update-plan",
    access: "paired-planning",
    requiresPairing: true,
    requiresPlanId: false,
    requiresApproval: false,
    mutation: false,
  },
  {
    method: "POST",
    path: "/api/bridge/asc/update-draft",
    access: "paired-mutation",
    requiresPairing: true,
    requiresPlanId: true,
    requiresApproval: true,
    approvalAction: "asc-update-draft",
    mutation: true,
  },
];

export function createAllowedOriginAllowlist(port, extraOrigins = process.env.BRIDGE_ALLOWED_ORIGINS) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
  ]);

  if (extraOrigins) {
    for (const origin of extraOrigins.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return origins;
}

export function getEndpointPolicy(method, pathname) {
  const normalizedMethod = method.toUpperCase();
  return (
    ENDPOINT_POLICIES.find(
      (policy) => policy.method === normalizedMethod && policy.path === pathname,
    ) ?? null
  );
}

export function getPolicyForPreflight(request, pathname) {
  const requestedMethod = request.headers["access-control-request-method"];
  if (typeof requestedMethod !== "string") return null;
  return getEndpointPolicy(requestedMethod, pathname);
}

export function getCorsHeaders(request, allowedOrigins) {
  const origin = request.headers.origin;
  if (typeof origin !== "string") return { allowed: true, headers: {} };

  if (!allowedOrigins.has(origin)) {
    return { allowed: false, headers: {} };
  }

  return {
    allowed: true,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "false",
      vary: "Origin",
    },
  };
}

export function getPreflightHeaders(request, allowedOrigins) {
  const cors = getCorsHeaders(request, allowedOrigins);
  if (!cors.allowed) return cors;

  return {
    allowed: true,
    headers: {
      ...cors.headers,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": BRIDGE_HEADER_ALLOWLIST,
      "access-control-max-age": "600",
    },
  };
}
