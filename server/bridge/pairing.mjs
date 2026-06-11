import crypto from "node:crypto";

export const DEFAULT_PAIRING_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_PAIRING_CHALLENGE_TTL_MS = 2 * 60 * 1000;

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createPairingCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPairingManager({
  challengeTtlMs = DEFAULT_PAIRING_CHALLENGE_TTL_MS,
  ttlMs = DEFAULT_PAIRING_TTL_MS,
  now = () => Date.now(),
  pairingCodeFactory = createPairingCode,
  tokenFactory = createToken,
} = {}) {
  let currentPairing = null;
  const challenges = new Map();

  function pruneExpiredChallenges() {
    const nowMs = now();
    for (const [challengeId, challenge] of challenges.entries()) {
      if (challenge.expiresAtMs <= nowMs) challenges.delete(challengeId);
    }
  }

  function createPairingChallenge({ origin = null } = {}) {
    pruneExpiredChallenges();

    const issuedAtMs = now();
    const challenge = {
      challengeId: crypto.randomUUID(),
      expiresAt: new Date(issuedAtMs + challengeTtlMs).toISOString(),
      expiresAtMs: issuedAtMs + challengeTtlMs,
      issuedAt: new Date(issuedAtMs).toISOString(),
      origin,
      pairingCode: pairingCodeFactory(),
    };
    challenges.set(challenge.challengeId, challenge);

    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
      issuedAt: challenge.issuedAt,
      pairingCode: challenge.pairingCode,
    };
  }

  function rotatePairingToken({ origin = null } = {}) {
    const issuedAtMs = now();
    currentPairing = {
      origin,
      token: tokenFactory(),
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
    };

    return { ...currentPairing };
  }

  function confirmPairingChallenge({ challengeId, pairingCode, origin = null } = {}) {
    pruneExpiredChallenges();

    const challenge = challenges.get(challengeId);
    if (!challenge) return { ok: false, reason: "missing-pairing-challenge" };
    if (!safeEqual(pairingCode, challenge.pairingCode)) {
      return { ok: false, reason: "invalid-pairing-code" };
    }
    if (challenge.origin && origin && challenge.origin !== origin) {
      return { ok: false, reason: "origin-mismatch" };
    }

    challenges.delete(challenge.challengeId);
    const pairing = rotatePairingToken({ origin: challenge.origin ?? origin });
    return { ok: true, ...pairing };
  }

  function validatePairingToken(token, { origin = null } = {}) {
    if (!currentPairing) return { ok: false, reason: "missing-pairing" };
    if (Date.parse(currentPairing.expiresAt) <= now()) {
      currentPairing = null;
      return { ok: false, reason: "expired-pairing" };
    }
    if (!safeEqual(token, currentPairing.token)) return { ok: false, reason: "invalid-pairing" };
    if (currentPairing.origin && origin && currentPairing.origin !== origin) {
      return { ok: false, reason: "origin-mismatch" };
    }

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
    confirmPairingChallenge,
    createPairingChallenge,
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
