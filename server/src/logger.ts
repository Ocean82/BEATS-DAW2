/**
 * Simple file + console logger for the backend.
 * Logs to server/logs/beats-daw.log when LOG_DIR is set or logs/ next to process cwd.
 */

import fs from 'fs';
import path from 'path';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const MIN_PRIORITY = LEVEL_PRIORITY[LOG_LEVELS.includes(MIN_LEVEL) ? MIN_LEVEL : 'info'];

function logDir(): string {
  const envDir = process.env.LOG_DIR;
  if (envDir) return envDir;
  return path.join(process.cwd(), 'logs');
}

function ensureLogDir(): string {
  const dir = logDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore; write will fail later
  }
  return dir;
}

function formatMessage(level: string, message: string, meta?: object): string {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

function writeToFile(level: string, message: string, meta?: object): void {
  try {
    const dir = ensureLogDir();
    const file = path.join(dir, 'beats-daw.log');
    fs.appendFileSync(file, formatMessage(level, message, meta));
  } catch {
    // avoid throwing from logger
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= MIN_PRIORITY;
}

function log(level: LogLevel, message: string, meta?: object): void {
  if (!shouldLog(level)) return;
  const line = formatMessage(level, message, meta).trimEnd();
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
  writeToFile(level, message, meta);
}

export const appLogger = {
  debug: (message: string, meta?: object) => log('debug', message, meta),
  info: (message: string, meta?: object) => log('info', message, meta),
  warn: (message: string, meta?: object) => log('warn', message, meta),
  error: (message: string, meta?: object) => log('error', message, meta),
  errorStack: (message: string, err: unknown) => {
    const meta: Record<string, string> = {};
    if (err instanceof Error && err.stack) meta.stack = err.stack;
    log('error', message, Object.keys(meta).length ? meta : undefined);
  },
};
