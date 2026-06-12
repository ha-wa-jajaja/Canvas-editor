# ST-1 Task Overview

## Goal

Extract the canvas editor logic from the Vue composables and `TemplateEditor.vue` into a standalone local package at `extract-canvas/`, while preserving current shape-editor behavior and fixing the small-element anchor overlap problem.

This folder defines the implementation tasks only. No package code should be written until these task files are reviewed and accepted.

## Task Order

1. `01-package-foundation.md`
2. `02-editor-runtime.md`
3. `03-vue-wrapper-integration.md`
4. `04-tests-and-verification.md`

## Shared Constraints

- Keep the package framework-agnostic.
- Do not import from `~/api/type`, Nuxt composables, Vue composables, or app stores inside `extract-canvas/src`.
- Keep API-specific mapping in the Vue wrapper via adapter functions.
- Preserve current behavior for:
  - drag
  - resize
  - delete
  - layer ordering
  - template load
  - canvas resize
- Include the anchor minimum-size fix in ST-1.

## Package Contract To Implement

The implementation should target this public surface:

```ts
new CanvasEditor<T = CanvasNode>({
  canvas,
  dimensions,
  adapter,
  onUpdate,
  onLayersChange,
})

editor.loadItems(items)
editor.setDimensions(dimensions)
editor.setContainerWidth(width)
editor.addDroppedItem(item)
editor.setActiveItem(unique)
editor.destroy()
```

Recommended adapter shape:

```ts
type CanvasEditorAdapter<T> = {
  fromItem?: (item: T) => CanvasNode
  toItem?: (node: CanvasNode, source: T) => T
  createItem?: (node: CanvasNode) => T
}
```

`createItem` is needed so the Vue wrapper can convert a dropped canvas node into the consumer item type without leaking app-specific types into the package.

## Cross-Task Decisions

- Internal type name: `CanvasNode`
- Old `TemplateNode` name should not remain inside the package
- The package owns mouse events and canvas drawing
- Vue owns:
  - `Teleport`
  - `VueDraggable`
  - template bus
  - store notices
  - i18n labels
  - conversion between `ProGenTemplateComponentAttr` and `CanvasNode`
- Integration test location: `.test/tests/e2e/`
- Package tests location: `extract-canvas/src/**/*.spec.ts`

## Definition of Done

- All four task files are implementable without open design decisions.
- The implementer can execute tasks in order without guessing interfaces or ownership.
