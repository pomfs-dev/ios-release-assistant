const SECRET_KEY_PATTERN =
  /(api[_-]?key|apple[_-]?credential|authorization|password|private[_-]?key|secret|token)/i;
const PEM_PRIVATE_KEY_PATTERN =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const SAFE_SECURITY_METADATA_KEYS = new Set([
  "mutationRequiresConfirmationToken",
  "secretStorage",
]);

function redactString(value) {
  return value.replace(PEM_PRIVATE_KEY_PATTERN, "[REDACTED]");
}

export function redactSecrets(value) {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SECRET_KEY_PATTERN.test(key) && !SAFE_SECURITY_METADATA_KEYS.has(key)
        ? "[REDACTED]"
        : redactSecrets(nestedValue),
    ]),
  );
}
