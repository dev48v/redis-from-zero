// STEP 2 — Tiny structured logger.
//
// Real apps reach for pino/winston, but for a teaching project a 30-line
// JSON-line logger keeps the dependency tree small and shows what those
// libraries actually do under the hood.

function emit(level, message, fields = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  // One JSON object per line — easy to grep, easy to ship to log aggregators.
  process.stdout.write(JSON.stringify(record) + '\n');
}

export const log = {
  info: (msg, fields) => emit('info', msg, fields),
  warn: (msg, fields) => emit('warn', msg, fields),
  error: (msg, fields) => emit('error', msg, fields),
};
