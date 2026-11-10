# 0006. One check command, and what it runs

## Context

The rules require one command that runs every check, wired into the pre-commit hook and CI so the two cannot diverge.

## Decision

`make check` runs, in order:

1. `prettier --check` (formatter)
2. `eslint --max-warnings 0` with typescript-eslint's strict type-checked and stylistic sets, the Obsidian plugin rules, and complexity limits: cyclomatic complexity 10, depth 4, parameters 5, 80 lines per function, 400 lines per file
3. `tsc --noEmit` (strict type checker)
4. `knip` (dead code and unused dependencies)
5. `depcruise` (the module boundaries in DESIGN.md)
6. `scripts/check-layout.mjs` (rejects files outside the allowed layout)
7. `npm test`
8. `npm run build`

`.githooks/pre-commit` runs `make check`. `.githooks/commit-msg` runs commitlint with the conventional-commits config. `npm install` points git at `.githooks` through the `prepare` script.

## Consequences

- A commit takes as long as the whole check. That is the price of the hook and CI being the same thing.
- A limit that seems wrong is raised under Open Questions in PROGRESS.md, not changed in passing.
