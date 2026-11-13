// Offline Node tests only: resolve Vite-style relative TS imports without changing app tsconfig.
const { registerHooks } = require('node:module');
const { existsSync } = require('node:fs');
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL && specifier.startsWith('.') && context.parentURL.includes('/frontend/src/')) {
    const url = new URL(specifier, context.parentURL);
    for (const candidate of [url.href.replace(/\.js$/, '.ts'), url.href + '.ts']) {
      if (candidate.endsWith('.ts') && existsSync(new URL(candidate))) return next(candidate, context);
    }
  }
  return next(specifier, context);
} });
