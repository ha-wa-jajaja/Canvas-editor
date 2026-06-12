# ST-1: CanvasEditor Class Package (Architecture)

## Direction

Move all canvas logic out of Vue composables into a vanilla TypeScript class. The class owns the canvas element, handles all mouse events, and communicates back via callbacks. The Vue component becomes a thin wrapper.

## Package Structure

```
extract-canvas/
  package.json        # name: @one-design/canvas-editor
  tsconfig.json
  src/
    index.ts          # exports: CanvasEditor, types
    CanvasEditor.ts   # main class
    types.ts
    constants.ts
    drawing/          # shape, anchors, borders, delete button
    events/           # mouse down/move/up, drag-drop
    utils/            # coordinate conversion, constraints, helpers
```

## Class API

```typescript
new CanvasEditor({
  canvas: HTMLCanvasElement,
  dimensions: { width, height },
  onUpdate(items),      // template-space coords, for saving
  onLayersChange(items) // canvas-space items, for layer panel
})
.loadItems(items)
.setDimensions(d)
.setContainerWidth(w)
.destroy()
```

## Source Composables → Target Files

| Composable                                          | → Package file                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `useDrawTempElement`                                | `drawing/drawShape.ts`, `drawAnchors.ts`, `drawBorders.ts`, `drawDeleteBtn.ts` |
| `useDrawSvgOnCanvas`                                | `drawing/drawDeleteBtn.ts`                                                     |
| `useTemplateCanvasEvents` + `useTempElementActions` | `events/mouseEvents.ts`                                                        |
| `useConvertTempElCords`                             | `utils/coordinates.ts`                                                         |
| `useLimitedWidthHeight`                             | `utils/constraints.ts`                                                         |
| `useTemplateCanvasUtils`                            | `utils/helpers.ts`                                                             |
| `types.ts` + `constants.ts`                         | `types.ts`, `constants.ts`                                                     |

## Data Adapter: Consumer Type ↔ Internal `CanvasNode`

### Problem

The current `useTemplateCanvasUtils.ts` converts `ProGenTemplateComponentAttr` (`x_min`, `y_min`, `x_max`, `y_max`, …) into `TemplateNode` (`x`, `y`, `width`, `height`, …). That API-specific shape must not live inside a standalone package — any consumer using different field names or a different coordinate convention would need to fork the conversion logic.

### Recommended approach: generic adapter on the constructor

Rename the internal type `TemplateNode` → `CanvasNode` (geometry-only, no API assumptions), and make `CanvasEditor` generic over the consumer's item type `T`:

```typescript
class CanvasEditor<T = CanvasNode> {
  constructor(options: {
    canvas: HTMLCanvasElement
    dimensions: { width: number; height: number }
    adapter?: {
      fromItem: (item: T) => CanvasNode // consumer data → internal
      toItem: (node: CanvasNode, source: T) => T // internal → consumer data
    }
    onUpdate: (items: T[]) => void
    onLayersChange: (items: T[]) => void
  })
  loadItems(items: T[]): void
  // ...
}
```

- When `T = CanvasNode` (no adapter provided), `fromItem`/`toItem` default to identity — zero overhead for simple consumers.
- `toItem` receives the original `source` item so the consumer can carry through fields the canvas never touched (e.g. API IDs, other metadata).
- All callbacks fire with `T[]`, so the consumer never needs to handle `CanvasNode` directly.

### What moves where

| Current location                                         | Moves to                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `templateComponentToNode` in `useTemplateCanvasUtils.ts` | `TemplateEditor.vue` — becomes the `fromItem` function passed to the constructor |
| Reverse mapping on `updateTemplate` emit                 | `TemplateEditor.vue` — becomes the `toItem` function                             |
| `TemplateNode` type                                      | Renamed to `CanvasNode` and exported from the package as the internal contract   |

### Internal `CanvasNode` type

```typescript
// extract-canvas/src/types.ts
export type CanvasNode = {
  x: number
  y: number
  width: number
  height: number
  type: string
  priority: number
  unique: string
  minWidth?: number
  minHeight?: number
  maxHeight?: number
}
```

Min/max constraint fields remain optional — they are populated by `fromItem` when the consumer's item carries them.

### Vue wrapper example

```typescript
// TemplateEditor.vue
const editor = new CanvasEditor<ProGenTemplateComponentAttr>({
  canvas: canvasEl.value,
  dimensions: props.dimensions,
  adapter: {
    fromItem: (attr) => ({
      x: attr.x_min,
      y: attr.y_min,
      width: attr.x_max - attr.x_min,
      height: attr.y_max - attr.y_min,
      type: attr.type,
      priority: attr.priority,
      unique: getComponentUnique(
        attr.type,
        attr.x_min,
        attr.y_min,
        attr.priority
      ),
      minWidth: attr.min_width,
      minHeight: attr.min_height,
    }),
    toItem: (node, source) => ({
      ...source,
      x_min: node.x,
      y_min: node.y,
      x_max: node.x + node.width,
      y_max: node.y + node.height,
      priority: node.priority,
    }),
  },
  onUpdate: (items) =>
    emit('updateTemplate', { ...template, structure: items }),
  onLayersChange: (items) => {
    layers.value = items
  },
})
```

## Vue Integration

- `TemplateEditor.vue`: instantiate class in `onMounted`, remove composable imports, wire callbacks to emits and reactive layer ref
- Keep VueDraggable + Teleport in the Vue layer (layer panel stays Vue-owned)
- `useProGenTemplateBus` stays in Vue layer; calls `editor.loadItems()` directly

## Subtask: Anchor Conflict on Small Elements

### Problem

`EL_MIN_SIZE` is currently `6` in `constants.ts`, which is effectively no constraint. `CORNER_ANCHOR_SIZE` is `26px` — so two opposing corner anchors alone require `52px` of element width/height before they stop overlapping. Below that threshold the anchors visually collide and the user can no longer reliably hit a specific handle.

### Recommended approach: anchor-aware minimum + graceful scaling

Two layers of defense:

**1. Enforce a hard minimum size derived from anchor geometry (in `utils/constraints.ts`)**

Update `EL_MIN_SIZE` in `constants.ts` to be derived from anchor dimensions rather than a magic number:

```typescript
// constants.ts
const EL_MIN_SIZE = CORNER_ANCHOR_SIZE * 2 + 4 // 56px — two corners + small gap
```

The resize functions `getResizeWidth` / `getResizeHeight` in `utils/constraints.ts` already clamp to `EL_MIN_SIZE` — no logic change needed there, just the constant.

**2. Scale anchors down when the element is near the minimum (in `drawing/drawAnchors.ts`)**

Instead of anchors suddenly stopping at a hard floor, scale the anchor dimensions proportionally when the element is smaller than `CORNER_ANCHOR_SIZE * 3`. This gives a graceful transition:

```
scale = clamp(min(elementWidth, elementHeight) / (CORNER_ANCHOR_SIZE * 3), 0.3, 1.0)
```

Apply `scale` to `ANCHOR_WIDTH`, `ANCHOR_HEIGHT`, and `CORNER_ANCHOR_SIZE` when drawing. The hit-detection logic in `useTempElementActions` (→ `events/mouseEvents.ts`) must use the same scale so clicking still works.

**Why not flip?**

A flip effect (element "reflects" when dragged past zero) is useful for free-form drawing tools but doesn't fit this layout-editor context — elements represent fixed-purpose zones that shouldn't invert their geometry. Minimum size enforcement is the right semantic here.

### Files to change

| File                                        | Change                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `extract-canvas/src/constants.ts`           | Replace `EL_MIN_SIZE = 6` with `EL_MIN_SIZE = CORNER_ANCHOR_SIZE * 2 + 4` |
| `extract-canvas/src/drawing/drawAnchors.ts` | Accept computed `anchorScale` and apply to all anchor dimensions          |
| `extract-canvas/src/events/mouseEvents.ts`  | Use same `anchorScale` for anchor hit detection                           |

`utils/constraints.ts` needs no logic change — it already clamps to `EL_MIN_SIZE`.

### Testing additions

Add to `extract-canvas/src/utils/constraints.spec.ts`:

- Resize to exactly `EL_MIN_SIZE` — element stops there, no further shrink
- Resize attempt below `EL_MIN_SIZE` — clamped back to minimum

Add to package tests (canvas mock):

- At element size `CORNER_ANCHOR_SIZE * 2`, anchors are drawn at reduced scale and do not exceed element bounds
- Anchor hit detection is consistent with drawn scale (clicking within scaled anchor region activates correct handle)

## Verification

Open `pages/manual/template-editor.vue` and confirm all existing shape interactions work: drag, resize, delete, layer reorder, template load, canvas resize. Also verify: shrinking an element to its minimum size stops cleanly, anchors remain visually separated and individually clickable at the smallest allowed size.

## Testing

**E2E (Playwright) — primary gate**

Test file: `e2e/canvas-editor/st1-architecture.spec.ts`

The goal is to prove that the refactored class produces the same user-visible behavior as the old composable-based implementation. Run against the `/manual/template-editor` dev page.

| Scenario                                | What to assert                                                      |
| --------------------------------------- | ------------------------------------------------------------------- |
| Drop a shape component onto canvas      | Element appears in the layer panel                                  |
| Drag the element around                 | `onUpdate` fires; element position changes in the JSON output panel |
| Resize via each of the 8 anchor handles | Element dimensions change correctly; min/max constraints respected  |
| Click the delete button                 | Element is removed from canvas and layer panel                      |
| Reorder layers via drag                 | Z-order on canvas reflects new priority                             |
| Load a saved template                   | Canvas populates with correct element positions                     |
| Resize the browser window               | Canvas rescales elements proportionally                             |

**Unit (Vitest) — assistants for pure logic**

Test file: `extract-canvas/src/utils/coordinates.spec.ts`

- `convertElCords` → `getRevertedElCords` round-trip returns original values (within floating-point tolerance) for a range of canvas/template dimension pairs

Test file: `extract-canvas/src/utils/constraints.spec.ts`

- `getLimitedWidth`/`getLimitedHeight` clamp to min/max for all 8 resize anchor directions
- `getResizeWidth`/`getResizeHeight` produce correct deltas from anchor drags
