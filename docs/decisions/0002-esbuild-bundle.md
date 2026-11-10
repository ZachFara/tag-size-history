# 0002. esbuild bundles the plugin into one file

## Context

Obsidian loads a single `main.js` in CommonJS form, with `obsidian` and a few other modules provided by the app.

## Decision

Bundle `src/main.ts` with esbuild into `main.js` (CommonJS, ES2020), with `obsidian`, `electron`, the CodeMirror and Lezer packages and Node built-ins marked external. `main.js` is gitignored and is built by `npm run build`, which is the last step of `make check`.

## Consequences

- The build is fast enough to run in the pre-commit hook.
- Runtime dependencies such as the chart library are bundled in, so their size is the plugin's size. Import only the parts used.
