import { sanitizeDiagnosticMessage } from './redaction';

describe('diagnostic redaction', () => {
  it('removes common credentials from persisted error messages', () => {
    const message = sanitizeDiagnosticMessage(
      new Error(
        'Request failed Authorization: Bearer abc.def-123? access_token=sensitive&api_key=also-sensitive',
      ),
    );

    expect(message).not.toContain('abc.def-123');
    expect(message).not.toContain('sensitive');
    expect(message).toContain('[REDACTED]');
  });

  it('limits diagnostic size', () => {
    expect(sanitizeDiagnosticMessage(new Error('x'.repeat(800)))).toHaveLength(
      500,
    );
  });
});
