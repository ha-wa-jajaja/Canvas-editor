import { CanvasEditor, createUniqueId } from '../dist/index.js'

// ─── Mock data (identical to pages/manual/template-editor.vue) ───────────────

const DIMENSION_OPTIONS = [
  { key: '1:1', label: '1:1 Square (1000×1000)', width: 1000, height: 1000 },
  { key: '4:5', label: '4:5 Portrait (800×1000)', width: 800, height: 1000 },
  { key: '16:9', label: '16:9 Landscape (1600×900)', width: 1600, height: 900 },
]

const MOCK_TEMPLATES = [
  {
    id: 1,
    name: 'Two Column',
    width: 1000,
    height: 1000,
    structure: [
      {
        type: 'product',
        x_min: 50,
        y_min: 50,
        x_max: 450,
        y_max: 450,
        priority: 0,
      },
      {
        type: 'endorser',
        x_min: 550,
        y_min: 50,
        x_max: 950,
        y_max: 450,
        priority: 1,
      },
      {
        type: 'logo',
        x_min: 50,
        y_min: 600,
        x_max: 300,
        y_max: 750,
        priority: 2,
      },
      {
        type: 'button',
        x_min: 550,
        y_min: 600,
        x_max: 950,
        y_max: 750,
        priority: 3,
      },
    ],
  },
  {
    id: 2,
    name: 'Top Product',
    width: 1000,
    height: 1000,
    structure: [
      {
        type: 'product',
        x_min: 50,
        y_min: 50,
        x_max: 950,
        y_max: 550,
        priority: 0,
      },
      {
        type: 'logo',
        x_min: 50,
        y_min: 620,
        x_max: 350,
        y_max: 800,
        priority: 1,
      },
      {
        type: 'button',
        x_min: 400,
        y_min: 620,
        x_max: 950,
        y_max: 800,
        priority: 2,
      },
    ],
  },
  {
    id: 3,
    name: 'Full Screen + Title',
    width: 1000,
    height: 1000,
    structure: [
      {
        type: 'product',
        x_min: 50,
        y_min: 50,
        x_max: 950,
        y_max: 700,
        priority: 0,
      },
      {
        type: 'tt1',
        x_min: 50,
        y_min: 730,
        x_max: 950,
        y_max: 830,
        priority: 1,
      },
      {
        type: 'tt2',
        x_min: 50,
        y_min: 850,
        x_max: 600,
        y_max: 950,
        priority: 2,
      },
    ],
  },
]

const MOCK_COMPONENTS = {
  101: {
    name: 'product',
    attributes: { width_percentage: 40, height_percentage: 40 },
  },
  102: {
    name: 'endorser',
    attributes: { width_percentage: 40, height_percentage: 40 },
  },
  103: {
    name: 'logo',
    attributes: { width_percentage: 25, height_percentage: 15 },
  },
  104: {
    name: 'button',
    attributes: { width_percentage: 35, height_percentage: 12 },
  },
  105: {
    name: 'tt1',
    attributes: { width_percentage: 80, height_percentage: 10 },
  },
  106: {
    name: 'tt2',
    attributes: { width_percentage: 60, height_percentage: 8 },
  },
  107: {
    name: 'form',
    attributes: { width_percentage: 70, height_percentage: 20 },
  },
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const formatSelect = document.getElementById('format-select')
const templateSelect = document.getElementById('template-select')
const loadBtn = document.querySelector('button.te-demo__btn')
const canvasWrap = document.querySelector('.canvas-wrapper')
const canvas = document.querySelector('canvas')
const outputPre = document.querySelector('.te-demo__output pre')
const layersPanel = document.getElementById('templateLayers')
const tabBtns = document.querySelectorAll('button.te-demo__tab')
const compPanel = document.querySelector('.te-demo__components')
const layersDiv = document.querySelector('.te-demo__layers')

// ─── Runtime state ────────────────────────────────────────────────────────────

let editor = null
let dimensions = DIMENSION_OPTIONS[0]
let draggingComponent = null
let layerCount = 0

// ─── Adapter (mirrors TemplateEditor.vue) ─────────────────────────────────────

function fromItem(attr) {
  return {
    x: attr.x_min,
    y: attr.y_min,
    width: attr.x_max - attr.x_min,
    height: attr.y_max - attr.y_min,
    type: attr.type,
    priority: attr.priority,
    unique: createUniqueId(attr.type, attr.x_min, attr.y_min, attr.priority),
  }
}

function toItem(node, source) {
  return {
    ...source,
    x_min: node.x,
    y_min: node.y,
    x_max: node.x + node.width,
    y_max: node.y + node.height,
    priority: node.priority,
  }
}

function createItem(node) {
  return {
    type: node.type,
    x_min: node.x,
    y_min: node.y,
    x_max: node.x + node.width,
    y_max: node.y + node.height,
    priority: node.priority,
  }
}

// ─── Editor callbacks ─────────────────────────────────────────────────────────

function onUpdate(items) {
  outputPre.textContent = JSON.stringify(items, null, 2)
}

function onLayersChange(items) {
  layerCount = items.length
  renderLayerItems(items)
}

// ─── Layer panel rendering + drag-and-drop ─────────────────────────────────────

function renderLayerItems(items) {
  layersPanel.innerHTML = ''
  const container = document.createElement('div')
  container.className = 'layer-items'

  for (const item of items) {
    const div = document.createElement('div')
    div.className = 'layer-item'
    div.draggable = true
    div.dataset.unique = item.unique
    div.textContent = item.type
    container.appendChild(div)
  }

  layersPanel.appendChild(container)
  setupLayerDnd(container)
}

function setupLayerDnd(container) {
  let dragSrc = null

  const commitOrder = () => {
    if (!dragSrc) return
    dragSrc.classList.remove('dragging')
    dragSrc = null
    const order = [...container.querySelectorAll('.layer-item')].map(
      (el) => el.dataset.unique
    )
    editor?.setLayerOrder(order)
  }

  container.addEventListener('dragstart', (e) => {
    dragSrc = e.target.closest('.layer-item')
    if (dragSrc) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', dragSrc.dataset.unique)
      dragSrc.classList.add('dragging')
    }
  })

  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const target = e.target.closest('.layer-item')
    if (!target || target === dragSrc || !dragSrc) return
    const rect = target.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    container.insertBefore(
      dragSrc,
      e.clientY < mid ? target : target.nextSibling
    )
  })

  // Listen on both the container and document — Playwright's synthetic dragTo
  // sometimes dispatches dragend off the original element.
  container.addEventListener('dragend', commitOrder)
  document.addEventListener('dragend', commitOrder)
}

// ─── Editor initialisation ────────────────────────────────────────────────────

function initEditor(width) {
  editor?.destroy()
  editor = new CanvasEditor({
    canvas,
    dimensions,
    adapter: { fromItem, toItem, createItem },
    onUpdate,
    onLayersChange,
  })
  editor.setContainerWidth(width)
}

// CanvasEditor.loadItems() emits layers-change but NOT onUpdate, so the JSON
// <pre> would stay empty after a load. Mirror what the Vue page does (it emits
// the template structure directly) by writing the structure to the output here.
function loadStructure(structure) {
  editor?.loadItems(structure)
  onUpdate(structure)
}

function bootWithDefaultTemplate(width) {
  initEditor(width)
  // Auto-load default template (Two Column = id 1) — mirrors onMounted in Vue page
  loadStructure(MOCK_TEMPLATES[0].structure)
}

// Boot once the canvas wrapper has a measurable width (mirrors wrapW logic in Vue)
const ro = new ResizeObserver(([entry]) => {
  const w = entry.contentRect.width
  if (!editor && w > 0) {
    bootWithDefaultTemplate(w)
  } else if (editor && w > 0) {
    editor.setContainerWidth(w)
  }
})
ro.observe(canvasWrap)

// Fallback: if layout is already resolved when the script runs, boot synchronously
if (canvasWrap.offsetWidth > 0 && !editor) {
  bootWithDefaultTemplate(canvasWrap.offsetWidth)
}

// ─── Load button ──────────────────────────────────────────────────────────────

loadBtn.addEventListener('click', () => {
  const val = templateSelect.value
  if (val === 'null') {
    loadStructure([])
  } else {
    const tmpl = MOCK_TEMPLATES.find((t) => String(t.id) === val)
    if (tmpl) loadStructure(tmpl.structure)
  }
})

// ─── Format select ────────────────────────────────────────────────────────────

formatSelect.addEventListener('change', () => {
  const opt = DIMENSION_OPTIONS.find((d) => d.key === formatSelect.value)
  if (!opt) return
  dimensions = opt
  canvasWrap.style.aspectRatio = `${opt.width}/${opt.height}`
  editor?.setDimensions(opt)
})

// ─── Component drag ───────────────────────────────────────────────────────────

document.querySelectorAll('.te-demo__comp-item').forEach((el) => {
  el.addEventListener('dragstart', () => {
    draggingComponent = MOCK_COMPONENTS[el.dataset.id]
  })
  el.addEventListener('dragend', () => {
    draggingComponent = null
  })
})

canvas.addEventListener('dragover', (e) => e.preventDefault())
canvas.addEventListener('drop', (e) => {
  e.preventDefault()
  if (!editor || !draggingComponent) return
  const { name, attributes } = draggingComponent
  editor.addDroppedItem({
    x: e.offsetX,
    y: e.offsetY,
    type: name,
    widthPercentage: attributes.width_percentage,
    heightPercentage: attributes.height_percentage,
    priority: layerCount,
  })
})

// ─── Tabs ─────────────────────────────────────────────────────────────────────

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('te-demo__tab--active'))
    btn.classList.add('te-demo__tab--active')
    const isComponents = btn.textContent.trim() === 'Components'
    compPanel.style.display = isComponents ? '' : 'none'
    layersDiv.style.display = isComponents ? 'none' : ''
  })
})
