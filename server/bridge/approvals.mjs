import crypto from "node:crypto";

export const DEFAULT_APPROVAL_TTL_MS = 5 * 60 * 1000;

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

function normalizePlanId(planId) {
  return typeof planId === "string" && planId.trim() ? planId.trim() : null;
}

export function createApprovalManager({
  ttlMs = DEFAULT_APPROVAL_TTL_MS,
  now = () => Date.now(),
  tokenFactory = createToken,
} = {}) {
  const approvals = new Map();

  function pruneExpired() {
    const nowMs = now();
    for (const [token, approval] of approvals.entries()) {
      if (approval.expiresAtMs <= nowMs || approval.usedAt) approvals.delete(token);
    }
  }

  function createApproval({ action, planId = null, origin = null } = {}) {
    const normalizedAction = typeof action === "string" ? action.trim() : "";
    if (!normalizedAction) return { ok: false, reason: "missing-action" };

    pruneExpired();

    const issuedAtMs = now();
    const token = tokenFactory();
    const approval = {
      action: normalizedAction,
      approvalId: crypto.randomUUID(),
      expiresAt: new Date(issuedAtMs + ttlMs).toISOString(),
      expiresAtMs: issuedAtMs + ttlMs,
      issuedAt: new Date(issuedAtMs).toISOString(),
      origin,
      planId: normalizePlanId(planId),
      token,
      usedAt: null,
    };
    approvals.set(token, approval);

    return {
      ok: true,
      action: approval.action,
      approvalId: approval.approvalId,
      expiresAt: approval.expiresAt,
      issuedAt: approval.issuedAt,
      planId: approval.planId,
      approvalToken: approval.token,
    };
  }

  function consumeApproval({ token, action, planId = null, origin = null } = {}) {
    pruneExpired();

    if (typeof token !== "string" || !token.trim()) {
      return { ok: false, reason: "missing-approval" };
    }

    const approval = [...approvals.values()].find((candidate) => safeEqual(candidate.token, token));
    if (!approval) return { ok: false, reason: "invalid-approval" };
    if (approval.usedAt) return { ok: false, reason: "used-approval" };
    if (approval.expiresAtMs <= now()) {
      approvals.delete(approval.token);
      return { ok: false, reason: "expired-approval" };
    }
    if (approval.action !== action) return { ok: false, reason: "action-mismatch" };
    if (approval.planId !== normalizePlanId(planId)) return { ok: false, reason: "plan-mismatch" };
    if (approval.origin && origin && approval.origin !== origin) {
      return { ok: false, reason: "origin-mismatch" };
    }

    approval.usedAt = new Date(now()).toISOString();
    approvals.delete(approval.token);
    return { ok: true, approvalId: approval.approvalId };
  }

  return {
    consumeApproval,
    createApproval,
  };
}

export function getApprovalTokenFromRequest(request, body = {}) {
  const headerToken = request.headers["x-ios-release-assistant-approval-token"];
  if (typeof headerToken === "string") return headerToken.trim();

  if (typeof body.approvalToken === "string") return body.approvalToken.trim();

  return null;
}
