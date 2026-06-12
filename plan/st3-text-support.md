# ST-3: Editable Text Boxes

## Depends on

ST-1 (CanvasEditor class must exist)

## Direction

Add a `text` element type with two modes: display mode (text rendered on canvas) and edit mode (HTML `<textarea>` overlay that appears on double-click). The class handles the display; the Vue layer handles the overlay.

## Type Extension

```typescript
// src/types.ts
TemplateNode.type: 'shape' | 'image' | 'text'
TemplateNode.content?: string
TemplateNode.fontSize?: number
TemplateNode.fontFamily?: string
TemplateNode.color?: string
```

## Package Changes

- Add `src/drawing/drawText.ts` — render text on canvas with word wrap and ellipsis truncation
- `CanvasEditor.ts` — add `onTextEdit(item, canvasBounds)` callback option; fire on double-click of a text element
- `CanvasEditor.ts` — add `updateTextContent(unique, content)` method for Vue to push edits back in

## Vue Layer Changes

- `TemplateEditor.vue` — listen to `onTextEdit` callback, position a `<textarea>` over the canvas at the given pixel bounds, hide it on blur/enter and call `editor.updateTextContent()`

## Verification

Drag text component → placeholder text renders on canvas. Double-click → textarea appears at correct position over element. Type and blur → canvas re-renders with new content. Resize element → text re-wraps to new bounds.

## Testing

**E2E (Playwright) — primary gate**

Test file: `e2e/canvas-editor/st3-text-support.spec.ts`

Run against the `/manual/template-editor` dev page. Extend mock components to include one with `type: 'text'`.

| Scenario | What to assert |
|----------|----------------|
| Drop a text component | Placeholder text visible on canvas |
| Double-click text element | `<textarea>` overlay appears; positioned within the element bounds |
| Type new content and press Enter / blur | Textarea closes; canvas re-renders with updated text |
| Resize text element (make narrower) | Text re-wraps to fit new width |
| Reload template with text element | `content` field present in JSON output; text re-renders on load |
| Single-click text element (not double) | Selects element (anchors appear) but does NOT open textarea |

**Unit (Vitest) — assistants for pure logic**

Test file: `extract-canvas/src/drawing/drawText.spec.ts`

- Word wrap: a long string exceeding element width is split into correct lines using a mock `CanvasRenderingContext2D` that returns fixed `measureText` values
- Ellipsis truncation: last visible line gets `…` appended when content overflows element height
- `updateTextContent(unique, content)` updates the matching node and marks the canvas dirty for redraw
