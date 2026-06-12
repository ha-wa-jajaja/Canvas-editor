# ST-2: Image Element Support

## Depends on

ST-1 (CanvasEditor class must exist)

## Direction

Add a new `image` element type to the canvas. When an image element is on the canvas, it renders the actual image (loaded from a URL) instead of a labelled rectangle. All existing interactions (resize, delete, layer order) work the same way.

## Type Extension

```typescript
// src/types.ts
TemplateNode.type: 'shape' | 'image' | 'text'  // was: string
TemplateNode.src?: string   // image URL, only used when type === 'image'
```

## Package Changes

- Add `src/drawing/drawImage.ts` — load image from URL, cache `HTMLImageElement` by src, render with `ctx.drawImage()`
- `CanvasEditor.ts` — dispatch to `drawImage` when element type is `image`

## Vue Layer Changes

- `useTempElementDragDrop.ts` — pass `src` when dropping an image-type component
- Sidebar component list can expose an `src` attribute on image components

## Verification

Drag an image component onto the canvas → image renders. Resize, delete, and layer reorder all work. Reload template → image persists via `src` in template structure.

## Testing

**E2E (Playwright) — primary gate**

Test file: `e2e/canvas-editor/st2-image-support.spec.ts`

Run against the `/manual/template-editor` dev page. Extend mock components in the page to include one with `type: 'image'` and a test image URL.

| Scenario | What to assert |
|----------|----------------|
| Drop an image component | Canvas pixel region at element bounds is non-grey (image rendered) |
| Resize image element | Element bounds update; image fills the new size |
| Delete image element | Element removed from canvas and layer panel |
| Reload template with image element | `src` field present in JSON output; image re-renders on load |
| Drop same image twice | Warning toast shown; only one instance on canvas |

**Unit (Vitest) — assistants for pure logic**

Test file: `extract-canvas/src/drawing/drawImage.spec.ts`

- Image cache: calling `loadImage(url)` twice returns the same `HTMLImageElement` instance (no second network request)
- `drawImageElement` calls `ctx.drawImage` with the correct x/y/width/height derived from a `CanvasNode`
