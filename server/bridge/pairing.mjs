import crypto from "node:crypto";

export const DEFAULT_PAIRING_TTL_MS = 30 * 60 * 1000;

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPairingManager({
  ttlMs = DEFAULT_PAIRING_TTL_MS,
  now = () => Date.now(),
  tokenFactory = createToken,
} = {}) {
  let currentPairing = null;

  function rotatePairingToken() {
    const issuedAtMs = now();
    currentPairing = {
      token: tokenFactory(),
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
    };

    return { ...currentPairing };
  }

  function validatePairingToken(token) {
    if (!currentPairing) return { ok: false, reason: "missing-pairing" };
    if (Date.parse(currentPairing.expiresAt) <= now()) {
      currentPairing = null;
      return { ok: false, reason: "expired-pairing" };
    }
    if (!safeEqual(token, currentPairing.token)) return { ok: false, reason: "invalid-pairing" };

    return { ok: true, expiresAt: currentPairing.expiresAt };
  }

  function revokePairingToken() {
    currentPairing = null;
  }

  function getPairingState() {
    if (!currentPairing) return { paired: false, expiresAt: null };
    if (Date.parse(currentPairing.expiresAt) <= now()) {
      currentPairing = null;
      return { paired: false, expiresAt: null };
    }

    return { paired: true, expiresAt: currentPairing.expiresAt };
  }

  return {
    getPairingState,
    revokePairingToken,
    rotatePairingToken,
    validatePairingToken,
  };
}

export function getPairingTokenFromRequest(request, body = {}) {
  const authorization = request.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerToken = request.headers["x-ios-release-assistant-pairing-token"];
  if (typeof headerToken === "string") return headerToken.trim();

  if (typeof body.pairingToken === "string") return body.pairingToken.trim();

  return null;
}
