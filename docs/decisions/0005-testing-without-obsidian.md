# 0005. Tests run under Node, with jsdom and a stub of Obsidian for the pop-up

## Context

Obsidian cannot run headless in CI. Most of the logic has no need for it. The pop-up and settings tab need Obsidian's `Modal`, `Setting` and DOM helpers.

## Decision

Use Node's built-in test runner with native TypeScript support. Pure modules are tested directly. UI modules are bundled with esbuild, with `obsidian` aliased to `test/obsidian-stub.ts`, and run under jsdom. The stub implements only what the plugin calls.

## Consequences

- No test framework dependency beyond jsdom.
- A new Obsidian API in a UI module means extending the stub.
- The stub is not Obsidian. A check in a real, throwaway Obsidian covers what the stub cannot (task T5).
