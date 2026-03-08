export const appLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  errorStack: (message: string, error: Error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}:`, error.stack || error.message);
  },
};
