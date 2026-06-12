# Task 02: Editor Runtime

## Objective

Implement the standalone `CanvasEditor` runtime and move all canvas drawing and interaction logic into the package.

## Ownership

This task owns:

- `extract-canvas/src/CanvasEditor.ts`
- `extract-canvas/src/drawing/*`
- `extract-canvas/src/events/*`

This task may import from package-local `types.ts`, `constants.ts`, and `utils/*`.

Do not edit Vue files in this task.

## Required Outputs

- `CanvasEditor<T>` class
- Package-owned draw cycle
- Package-owned mouse state and event binding
- Package-owned drag, resize, delete, and layer-order manipulation logic
- Shared anchor scaling applied consistently to drawing and hit detection

## Step-by-Step Work

1. Create `CanvasEditor.ts`.
   - Accept constructor options:
     - `canvas`
     - `dimensions`
     - `adapter`
     - `onUpdate`
     - `onLayersChange`
   - Initialize canvas context and internal state
   - Bind mouse listeners

2. Define internal editor state.
   - `nodes`
   - `sourceItems`
   - current canvas dimensions
   - current container width
   - active item
   - hover item
   - active anchor
   - clicked state
   - last mouse coordinates

3. Implement package draw modules.
   - `drawing/drawShape.ts`
   - `drawing/drawAnchors.ts`
   - `drawing/drawBorders.ts`
   - `drawing/drawDeleteBtn.ts`
   - Keep each file focused on rendering only

4. Implement event modules.
   - `events/mouseEvents.ts` should encapsulate hit detection, dragging, resizing, delete-button checks, and cursor updates
   - Use the same anchor scale function used by the drawing module

5. Implement editor lifecycle methods.
   - `loadItems(items)`
   - `setDimensions(dimensions)`
   - `setContainerWidth(width)`
   - `addDroppedItem(payload)`
   - `setActiveItem(unique)`
   - `destroy()`

6. Implement conversion flow inside the editor.
   - On `loadItems`, convert consumer items `T` into `CanvasNode`
   - On update, convert nodes back into `T[]`
   - Preserve untouched source fields through `toItem(node, source)`
   - Use package-native `CanvasDropPayload` to create new `CanvasNode` instances for drops
   - Use `createItem(node)` for new nodes created from drops when no prior source item exists

7. Implement item ordering behavior.
   - Preserve current topmost-item lookup semantics
   - Preserve move-to-top behavior on selection
   - Keep `priority` values aligned with visible z-order when emitting updates

8. Implement draw scheduling.
   - Clear and redraw canvas when:
     - items load
     - dimensions change
     - container width changes
     - mouse drag/resize moves
     - active item changes
     - deletion happens

9. Implement delete button handling.
   - Draw only for the active item
   - Keep the click target consistent with the rendered button position

10. Export `CanvasEditor` through `src/index.ts`.

## Required Decisions To Lock In

- The editor owns global `mouseup` registration and must clean it up in `destroy()`
- The editor should emit `onLayersChange` whenever internal order changes or items are reloaded
- `setContainerWidth(width)` is the replacement for the old wrapper resize logic
- `addDroppedItem(payload)` should accept `CanvasDropPayload`
- The wrapper remains the only place that knows app field names because it must convert drag/drop data into `CanvasDropPayload`

## Acceptance Criteria

- No runtime logic depends on Vue refs or composables
- Drag, resize, delete, hover, and active selection are package-owned
- Anchor scale is used by both drawing and hit detection
- Resizing stops cleanly at the minimum size
- The runtime can function with a plain `HTMLCanvasElement`

## Handoff Notes

- Task 03 will instantiate this class and provide the adapter implementation
- Task 03 should convert dragged app data into `CanvasDropPayload` before calling `addDroppedItem(...)`
- Task 04 will test this class directly with canvas mocks and synthetic mouse events
