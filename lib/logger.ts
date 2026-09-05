export const logger = {
  info: (msg: string, meta?: any) => {
    if (meta !== undefined) console.log(`[INFO] ${msg}`, meta);
    else console.log(`[INFO] ${msg}`);
  },
  warn: (msg: string, meta?: any) => {
    if (meta !== undefined) console.warn(`[WARN] ${msg}`, meta);
    else console.warn(`[WARN] ${msg}`);
  },
  error: (msg: string, meta?: any) => {
    if (meta !== undefined) console.error(`[ERROR] ${msg}`, meta);
    else console.error(`[ERROR] ${msg}`);
  },
  debug: (msg: string, meta?: any) => {
    if (process.env.DEBUG) {
      if (meta !== undefined) console.debug(`[DEBUG] ${msg}`, meta);
      else console.debug(`[DEBUG] ${msg}`);
    }
  },
};
