/**
 * Minimal structured logger: JSON lines with level/message/context/timestamp,
 * no external dependency (no Sentry account configured for this project).
 * Replaces ad hoc `console.error('[Prefix] ...')` calls with a consistent,
 * machine-parseable shape — the old `[Prefix]` convention becomes
 * `context.service` instead of being embedded in the message string.
 *
 * The only module allowed to call console.log/console.info directly (see
 * .eslintrc.json's no-console rule, which bans them everywhere else) — it
 * IS the abstraction the rest of the codebase should use instead.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/** Error objects have no own enumerable properties, so JSON.stringify(error) is '{}' — expand them explicitly. */
function normalizeContext(context: LogContext | undefined): LogContext | undefined {
  if (!context) return undefined;

  const normalized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    normalized[key] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value;
  }
  return normalized;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const normalized = normalizeContext(context);
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(normalized ? { context: normalized } : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      // eslint-disable-next-line no-console -- this is the sanctioned wrapper; call logger.info/debug elsewhere instead of console.log directly.
      console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void => emit('debug', message, context),
  info: (message: string, context?: LogContext): void => emit('info', message, context),
  warn: (message: string, context?: LogContext): void => emit('warn', message, context),
  error: (message: string, context?: LogContext): void => emit('error', message, context),
};
