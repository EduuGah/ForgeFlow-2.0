# 15 — Development Workflow

## Issue-driven development

Every implementation task is a GitHub Issue.

One issue should represent a coherent, reviewable change.

Recommended lifecycle:

Issue → branch → implement → test → commit → push → PR → review → merge → close.

## Branches

Examples:
- feat/mobile-foundation
- feat/local-database
- feat/workout-execution
- fix/sync-retry

Avoid giant feature branches containing unrelated work.

## Commit convention

Use Conventional Commits:
- feat:
- fix:
- refactor:
- test:
- docs:
- chore:
- perf:

Examples:
- feat: add local workout persistence
- test: cover volume and PR calculations
- feat: add outbox synchronization
- fix: prevent duplicate sync operations

## AI coding protocol

At the end of every prompt, the AI must report:

### Changed
Short list.

### Validation
Commands/tests actually executed.

### Files
Relevant files changed.

### Commit
Exactly one recommended commit message.

### Issue
Which GitHub issue the work belongs to.

The AI must not claim tests were run if they were not run.

## Scope discipline

If the requested issue reveals a dependency that is not implemented, stop and report it instead of silently implementing half of the dependency.

## Review checklist

- correctness
- types
- tests
- offline behavior
- sync behavior
- authorization
- accessibility
- performance
- no secrets
- no unrelated changes
