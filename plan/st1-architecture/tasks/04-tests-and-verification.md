# Task 04: Tests and Verification

## Objective

Add test coverage for the extracted package and verify that the Vue wrapper still behaves like the current editor in the browser.

## Ownership

This task owns:

- `extract-canvas/src/**/*.spec.ts`
- `.test/tests/e2e/*`
- minimal supporting test setup only if required

Do not refactor production logic in this task except for small testability hooks that are clearly justified.

## Required Outputs

- Package-level utility tests
- Package-level runtime interaction tests
- Browser integration tests against `/manual/template-editor`
- Explicit manual verification checklist

## Step-by-Step Work

1. Add utility tests in `extract-canvas/src/utils/coordinates.spec.ts`.
   - Round-trip conversion from template space to canvas space and back
   - Multiple dimension pairs
   - Floating-point tolerance where appropriate

2. Add utility tests in `extract-canvas/src/utils/constraints.spec.ts`.
   - width and height min/max clamping
   - resize delta behavior for all anchor directions
   - clamp at the new `EL_MIN_SIZE`
   - attempts to shrink below the minimum stay at the minimum

3. Add runtime tests for the editor class.
   - Instantiate with a real `HTMLCanvasElement`
   - Mock `CanvasRenderingContext2D`
   - Dispatch synthetic mouse events
   - Cover:
     - selection
     - dragging
     - resizing
     - deletion
     - layer update callback
     - update callback shape

4. Add anchor-scale tests.
   - Small elements draw scaled anchors that stay within bounds
   - Hit detection matches the scaled anchor geometry

5. Add browser integration tests under `.test/tests/e2e/`.
   - Use the existing `@nuxt/test-utils/e2e` style already present in the repo
   - Target `/manual/template-editor`

6. Cover these browser scenarios.
   - drop a component onto the canvas
   - drag it and verify JSON output changes
   - resize via anchors and verify dimensions change
   - delete the active item
   - load a saved template
   - reorder layers and verify behavior remains correct
   - resize viewport or container and verify proportional rescaling

7. Write a manual verification checklist for the implementer.
   - drag
   - resize
   - delete
   - layer reorder
   - template load
   - canvas resize
   - minimum-size anchor behavior

## Required Decisions To Lock In

- Use `.test/tests/e2e/` for browser coverage instead of creating a separate Playwright harness
- Package tests are the primary correctness gate for logic
- Browser tests validate the wrapper and real interaction flow

## Acceptance Criteria

- Core utility logic has direct automated coverage
- The editor runtime is tested without Vue
- Browser tests prove wrapper parity on the manual page
- The anchor-overlap regression is covered explicitly

## Handoff Notes

- If test setup friction appears, prefer the smallest setup change that preserves the repo’s current testing approach
- Report any remaining manual-only verification gaps explicitly
