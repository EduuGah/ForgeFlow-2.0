const MAX_DIAGNOSTIC_LENGTH = 500;

export function sanitizeDiagnosticMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(access_?token|refresh_?token|api_?key|password|secret)=[^\s&]+/gi,
      '$1=[REDACTED]',
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[REDACTED_TOKEN]',
    )
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}
