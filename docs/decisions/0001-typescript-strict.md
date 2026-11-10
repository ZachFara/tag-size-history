# 0001. TypeScript in strict mode

## Context

Obsidian plugins are JavaScript loaded by the app. The official sample plugin and the type definitions are TypeScript. The owner's other plugins use TypeScript.

## Decision

Write the plugin and its tests in TypeScript with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noUnusedLocals` and `noUnusedParameters`. `tsc --noEmit` is the type checker; it never emits.

## Consequences

- Indexing an array gives `T | undefined`, so code has to handle the missing case.
- Files that tests import directly must use erasable syntax only (no enums, namespaces or parameter properties), because Node strips types without compiling.
