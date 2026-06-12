# Manual Verification Checklist — Template Canvas Editor

Run the dev server (`npm run dev`) and open `/manual/template-editor` in a browser.

## Setup

- [ ] Page loads without console errors
- [ ] Canvas is visible inside the editor area
- [ ] "Two Column" template is auto-loaded (4 coloured rectangles visible)
- [ ] Layer panel shows 4 items when the Layers tab is selected

## Drag

- [ ] Hover over a rectangle — cursor changes to a hand (`pointer`)
- [ ] Click to select a rectangle — white border and anchors appear around it
- [ ] Drag the selected rectangle to a new position — it moves smoothly
- [ ] Release the mouse — rectangle stays at the new position
- [ ] JSON output (bottom panel) shows updated `x_min`/`y_min` values

## Resize

- [ ] Select a rectangle — anchors are visible at all 8 positions
- [ ] Hover over a corner anchor — cursor changes to a diagonal-resize arrow
- [ ] Drag a corner anchor — rectangle resizes proportionally in both axes
- [ ] Drag a mid-edge anchor — rectangle resizes in one axis only
- [ ] JSON output shows updated `x_max`/`y_max` values after resize

## Minimum-size anchor behaviour

- [ ] Resize a rectangle to the smallest it can go (stop dragging when it no longer shrinks)
- [ ] The rectangle does not collapse below its minimum size (anchors stay visible and separated)
- [ ] Hit targets for each anchor remain distinct — clicking near one anchor does not accidentally activate a neighbouring one

## Delete

- [ ] Select a rectangle — red delete button appears near its top-right corner
- [ ] Hover over the delete button — cursor changes to a hand (`pointer`)
- [ ] Click the delete button — the rectangle is removed from the canvas
- [ ] JSON output no longer contains that item
- [ ] Layer panel no longer lists that item

## Layer reorder

- [ ] Switch to the Layers tab in the sidebar
- [ ] Drag a layer row up or down — the rectangle order changes on the canvas
- [ ] The JSON structure reflects the new `priority` order

## Template load

- [ ] Select "Top Product" from the Format dropdown and click **Load** — canvas shows 3 rectangles
- [ ] Select "Full Screen + Title" and click **Load** — canvas shows 3 rectangles with a large product area
- [ ] Select "— blank canvas —" and click **Load** — canvas is empty

## Canvas resize / proportional rescaling

- [ ] Change the Format dropdown to "4:5 Portrait" — the canvas redraws at a taller aspect ratio
- [ ] Change the Format dropdown to "16:9 Landscape" — the canvas redraws at a wider aspect ratio
- [ ] Existing rectangles rescale proportionally (positions and sizes adjust relative to the new canvas dimensions)
- [ ] Resize the browser window — the canvas container resizes and rectangles scale accordingly (debounced)
