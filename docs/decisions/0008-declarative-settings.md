# 0008. The settings tab uses Obsidian's declarative settings, so the plugin needs Obsidian 1.13

## Context

Obsidian 1.13 added `getSettingDefinitions()`: a settings tab returns a list of setting descriptions and Obsidian draws them and includes them in settings search. The older `display()` method is deprecated, and the Obsidian lint rules in `make check` warn when a tab does not implement the new method. The owner runs Obsidian 1.15. Every setting this plugin has (a dropdown, a text field, a number, a toggle) is a built-in control type.

## Decision

Implement only `getSettingDefinitions()`, and set `minAppVersion` to 1.13.0. The `obsidian` typings package is 1.14.4. The tab overrides `getControlValue` and `setControlValue` to read and save through a store that `main` supplies, and every change passes through `normalizeSettings`.

## Consequences

- The plugin does not load on Obsidian older than 1.13.
- No hand-written settings UI, and the settings are searchable.
- The tab's definitions are tested directly. How Obsidian draws them is checked in a real Obsidian (task T5).
