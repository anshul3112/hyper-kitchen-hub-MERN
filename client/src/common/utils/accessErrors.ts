const BLOCKED_ACCESS_PATTERNS = [
  "disabled",
  "forbidden",
  "unauthorized",
  "invalid or expired access token",
  "invalid or expired display token",
  "assigned tenant not found",
  "assigned outlet not found",
  "tenant assignment missing",
  "outlet assignment missing",
];

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function isBlockedAccessError(error: unknown): boolean {
  const message = getErrorMessage(error, "").toLowerCase();
  return BLOCKED_ACCESS_PATTERNS.some((pattern) => message.includes(pattern));
}

export function getBlockedAccessMessage(error: unknown, fallback = "Access denied"): string {
  const message = getErrorMessage(error, fallback).trim();
  return message || fallback;
}