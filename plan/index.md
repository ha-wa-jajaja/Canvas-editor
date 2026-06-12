# Canvas Editor Extraction — Plan Overview

## Goal

Extract the canvas editor logic from `components/Template/TemplateEditor.vue` into a standalone, framework-agnostic TypeScript package (`@one-design/canvas-editor`) that can be reused across projects. Then extend it with image and editable text element support.

## Subtasks

| # | File | Description | Depends on |
|---|------|-------------|------------|
| ST-1 | [st1-architecture.md](./st1-architecture.md) | Create `CanvasEditor` class package, port existing composables, wire into Vue | — |
| ST-2 | [st2-image-support.md](./st2-image-support.md) | Add real image element type with canvas rendering | ST-1 |
| ST-3 | [st3-text-support.md](./st3-text-support.md) | Add editable text element type with HTML overlay input | ST-1 |

## Source to Extract From

- `components/Template/TemplateEditor.vue` — main component to refactor
- `composables/templateCanvas/` — all 9 composables become the class internals
- `components/ProGen/ProGenLayout.vue` — uses TemplateEditor; should need no changes

## Target Package Location

`extract-canvas/` (local workspace package, publishable as npm later)

## Current Demo Page

`pages/manual/template-editor.vue` — manual verification surface and E2E integration target

## Testing Strategy

**Stack:** Vitest (package tests) + Playwright (app integration)

Because the output is a standalone package, tests live in two distinct places with different goals:

| Layer | Tool | Location | What it validates |
|-------|------|----------|-------------------|
| Package tests | Vitest + jsdom | `extract-canvas/src/**/*.spec.ts` | `CanvasEditor` class behavior — framework-agnostic, no Nuxt |
| App integration | Playwright | `e2e/canvas-editor/` | Vue wrapper + real browser behavior on `/manual/template-editor` |

**Package tests are the primary gate.** They run inside `extract-canvas/` and import the class directly. Canvas rendering is tested via a mock `CanvasRenderingContext2D`; user interactions are tested by dispatching synthetic mouse events on a real (jsdom) `HTMLCanvasElement`. These tests travel with the package and prove it works independent of any framework.

**App integration tests (Playwright) are the secondary gate.** They validate the Vue wrapper (`TemplateEditor.vue`) and the full interaction loop in a real browser. They are not package tests — they test the consumer.

**Unit tests within the package** (utility functions like coordinate conversion, constraint clamping, text wrapping) still assist by covering pure algorithmic logic in isolation.

Each subtask plan includes its own Testing section with specific scenarios for both layers.
