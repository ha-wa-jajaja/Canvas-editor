# Task 01: Package Foundation

## Objective

Create the standalone package scaffold and the shared contracts/utilities that every later ST-1 task depends on.

## Ownership

This task owns only package foundation files:

- `extract-canvas/package.json`
- `extract-canvas/tsconfig.json`
- `extract-canvas/src/index.ts`
- `extract-canvas/src/types.ts`
- `extract-canvas/src/constants.ts`
- `extract-canvas/src/utils/*`

Do not edit Vue files in this task.

## Required Outputs

- A buildable local package skeleton
- Exported package types and constants
- Shared utility functions for:
  - coordinate conversion
  - reverse conversion
  - width and height constraints
  - resize delta calculations
  - drop-size initialization
  - unique ID generation
  - anchor scaling

## Implementation Record

- `extract-canvas` is implemented as an ESM-only local TypeScript package with a plain `tsc` build.
- The package currently exports:
  - `CanvasNode`, `CanvasDimensions`, `CanvasDropPayload`, adapter/option types, shared mouse/anchor types
  - anchor/delete-button constants and cursor mappings
  - pure utilities from `src/utils/*`
- Drop creation is standardized around a package-native `CanvasDropPayload`.
  - The Vue wrapper is expected to translate app-specific drag data into this payload before calling the editor.

## Step-by-Step Work

1. Create `extract-canvas/package.json`.
   - Package name: `@one-design/canvas-editor`
   - Use an ESM package shape with a plain `tsc` build
   - Add scripts for build and test execution
   - Keep dependencies minimal

2. Create `extract-canvas/tsconfig.json`.
   - Target TypeScript package compilation
   - Ensure source files in `src/` are included

3. Create `extract-canvas/src/types.ts`.
   - Define `CanvasNode`
   - Define constructor option types
   - Define adapter types
   - Define dimensions type
   - Define drop payload type for wrapper-driven creation
   - Use camelCase package-owned fields on the drop payload:
     - `x`
     - `y`
     - `type`
     - `widthPercentage`
     - `heightPercentage`
     - `minWidth?`
     - `minHeight?`
     - `maxHeight?`
     - `priority?`
     - `unique?`
   - Define any internal mouse-state and anchor types that are shared across modules

4. Rename the old internal concept from `TemplateNode` to `CanvasNode`.
   - Keep geometry-only fields
   - Keep optional min/max constraint fields
   - Do not include API-specific field names like `x_min`

5. Create `extract-canvas/src/constants.ts`.
   - Port current anchor and delete-button constants
   - Replace `EL_MIN_SIZE = 6` with `CORNER_ANCHOR_SIZE * 2 + 4`
   - Export cursor mappings

6. Create coordinate utilities.
   - Add functions to map consumer/template space into canvas space
   - Add reverse mapping back from canvas space to consumer space
   - Keep these functions pure

7. Create constraint utilities.
   - Port min/max width and height logic
   - Port resize delta logic
   - Port initial width and height logic for dropped items
   - Keep these functions pure

8. Create helper utilities.
   - Add unique ID generation
   - Add anchor scale calculation
   - Add any small reusable helpers needed by later tasks

9. Create `extract-canvas/src/index.ts`.
   - Re-export public types
   - Re-export constants only if needed externally
   - Re-export `CanvasEditor` placeholder type only after Task 02 is implemented

## Required Decisions To Lock In

- `CanvasNode` fields:
  - `x`
  - `y`
  - `width`
  - `height`
  - `type`
  - `priority`
  - `unique`
  - `minWidth?`
  - `minHeight?`
  - `maxHeight?`
- `createItem(node)` belongs on the adapter, not in the editor constructor root
- Dropped-item creation uses package-native `CanvasDropPayload`, not consumer item `T`
- Utility functions must be package-local and have no Vue reactivity dependencies

## Acceptance Criteria

- No package file imports from `~/...`, `#imports`, `vue`, or Nuxt composables
- `CanvasNode` is the only internal node type name
- The minimum size constant is anchor-aware
- Utility APIs are pure and reusable by Task 02 and Task 04

## Handoff Notes

- Task 02 will consume the exported types, constants, and utility functions directly
- Task 02 should import and use `CanvasDropPayload` for `addDroppedItem(...)`
- Do not implement drawing or mouse handling here
