export class TUIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public hint?: string
  ) {
    super(message);
    this.name = 'TUIError';
  }
}

export class ConfigError extends TUIError {
  constructor(message: string, hint?: string) {
    super(message, 'CONFIG_ERROR', hint);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends TUIError {
  constructor(message: string, hint?: string) {
    super(message, 'VALIDATION_ERROR', hint);
    this.name = 'ValidationError';
  }
}

export class ProviderError extends TUIError {
  constructor(message: string, hint?: string) {
    super(message, 'PROVIDER_ERROR', hint);
    this.name = 'ProviderError';
  }
}

export function formatError(error: unknown): { message: string; hint?: string } {
  if (error instanceof TUIError) {
    return { message: error.message, hint: error.hint };
  }
  
  if (error instanceof Error) {
    return { message: error.message };
  }
  
  return { message: String(error) };
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('429') ||
      message.includes('rate limit')
    );
  }
  return false;
}
