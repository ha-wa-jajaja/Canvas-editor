# Task 03: Vue Wrapper Integration

## Objective

Refactor `components/Template/TemplateEditor.vue` into a thin wrapper around the new `CanvasEditor` package while preserving the current UI contract and app integrations.

## Ownership

This task owns:

- `components/Template/TemplateEditor.vue`
- `pages/manual/template-editor.vue` only if a small adjustment is required for integration clarity

Do not implement package internals in this task.

## Required Outputs

- `TemplateEditor.vue` instantiates `CanvasEditor`
- The wrapper provides adapter functions for current app data shapes
- Vue keeps layers UI, template-bus handling, and store/i18n responsibilities

## Step-by-Step Work

1. Remove direct use of the old canvas composables from `TemplateEditor.vue`.
   - `useDrawTempElement`
   - `useTemplateCanvasEvents`
   - `useConvertTempElCords`
   - `useTemplateCanvasUtils`
   - `useTempElementDragDrop`

2. Import the package class and types from `extract-canvas/src`.

3. Define adapter functions inside the wrapper.
   - `fromItem(attr)` converts `ProGenTemplateComponentAttr` into `CanvasNode`
   - `toItem(node, source)` converts `CanvasNode` back into `ProGenTemplateComponentAttr`
   - `createItem(node)` creates a fresh `ProGenTemplateComponentAttr` for newly dropped items

4. Instantiate the editor in `onMounted`.
   - Pass:
     - `canvas`
     - `dimensions`
     - adapter
     - `onUpdate`
     - `onLayersChange`

5. Replace current update flow.
   - `onUpdate(items)` should emit `updateTemplate` with the current template metadata and `structure: items`
   - `onLayersChange(items)` should update the reactive layer array used by `VueDraggable`

6. Replace current resize flow.
   - Watch wrapper width and call `editor.setContainerWidth(wrapW)`
   - Watch `dimensions` and call `editor.setDimensions(dimensions)`

7. Replace template loading flow.
   - Keep `useProGenTemplateBus` in Vue
   - When a saved template loads, call `editor.loadItems(item.structure)`
   - Preserve current `templateData` metadata in Vue so emitted updates still include `id`, `width`, `height`, and `created_by`

8. Replace drag-drop flow.
   - Keep duplicate checks, notices, and i18n in Vue
   - On valid drop, build a new `ProGenTemplateComponentAttr` using the dragged component attributes and canvas-relative drop coordinates
   - Call `editor.addDroppedItem(newItem)`

9. Keep layer panel behavior in Vue.
   - `Teleport` stays unchanged
   - `VueDraggable` stays unchanged
   - Clicking a layer row should call `editor.setActiveItem(unique)`
   - Reordering should push the new order back into the editor using a dedicated method or `loadItems`, whichever Task 02 exposes

10. Destroy the editor in `onBeforeUnmount`.

## Required Decisions To Lock In

- Vue continues to own duplicate-item warnings because they currently depend on app notice store + i18n
- Layer labels remain translated in Vue, not in the package
- Wrapper emits `Partial<ProGenTemplate>` exactly as before to avoid downstream breakage

## Acceptance Criteria

- `TemplateEditor.vue` is a thin integration layer
- All canvas logic composable imports are removed from the wrapper
- Existing parent usage remains compatible
- Manual page still supports loading templates, dragging components, and inspecting emitted JSON

## Handoff Notes

- Task 04 should verify this wrapper through the manual page and e2e coverage
- If layer reordering needs a dedicated runtime API, Task 03 should request it from Task 02 rather than re-implement order logic locally
