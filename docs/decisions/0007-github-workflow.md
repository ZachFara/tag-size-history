# 0007. GitHub workflow

## Context

Work is done through branches and pull requests, and `main` must only receive changes that pass the check. The repo is public, which makes branch protection available on a free account.

## Decision

CI is one workflow with one job named `check`. It installs with `npm ci`, runs `make check`, and on pull requests also runs commitlint over the pull request's commits. `main` is protected: pull requests required, the `check` job required and up to date, force pushes and deletion disallowed, rules applied to administrators. No approving review is required, because the owner is the only person on the repo. The pull request template has What changed, Why, and How it was tested.

A `release` workflow runs on any tag: it runs `make check`, fails if the tag does not equal the manifest version, and creates a draft release with `main.js`, `manifest.json` and `styles.css`.

## Consequences

- The job name `check` is what branch protection refers to. Renaming it breaks the requirement.
- Nothing is published by pushing to `main`. Publishing takes a tag and a click.
