// Minimal structured logger wrapper - replace with pino/winston later if desired
const format = (level, message, meta) => {
  const base = { time: new Date().toISOString(), level, message };
  return JSON.stringify(Object.assign(base, meta || {}));
};

export const info = (message, meta) => console.log(format('info', message, meta));
export const warn = (message, meta) => console.warn(format('warn', message, meta));
export const error = (message, meta) => console.error(format('error', message, meta));

export default { info, warn, error };
