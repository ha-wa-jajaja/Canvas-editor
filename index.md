This plan is to extract the template editor, which is the canvas related functions from components/Template/TemplateEditor.vue.

Besides the drawing canvas, the layer manager and the component list (components/ProGen/ProGenLayout.vue .pro-gen-layout\_\_sidebar-content(#25)).

Additionally, currently this only supports shape editing and resizing. We want to also make this possible to drop & edit image and text boxes.

One bigger picture is consider what we can do to create a .js package, and with base logics that can be exported and used across packages.

Or no need to take this approach? Can simply have something like this:

```es6
const canvasEditor = new CanvasEditor({
  // ....props
  onUpdate(items) {
    // will receive the updated items, so can apply to reactive values
  },
})
```

So we won't necessarily need a lot of duplicated codes?

Check our existing codebase and check if our existing structure is capable of these requirements and extensions.

Clarify anything unclear before making any design decisions.
If after discussion, the plan will be too big, divide into subtasks.
