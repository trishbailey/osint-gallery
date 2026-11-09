// Interactive Unovis pilot. Bundled to axis-network/unovis-preview.js.
// Imports only @unovis/ts (the SSR package renders the noscript fallback).

import { Graph } from '@unovis/ts/components/graph/index.js'
import { SingleContainer } from '@unovis/ts/containers/single-container/index.js'
import { Tooltip } from '@unovis/ts/components/tooltip/index.js'
import { zoomIdentity } from 'd3-zoom'
import {
  GROUPS, MIN_FLOW, FLOW_DOT_MIN, endId, groupOf, toGraphData, linkWidth, rgba, niceDate,
} from './model.mjs'

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

function sourceColor(link) {
  const id = endId(link.source)
  return (groupOf(id) || {}).color || '#e6e9ef'
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function routesFor(links, id) {
  const out = links.filter(l => endId(l.source) === id).sort((a, b) => b.n - a.n)
  const inn = links.filter(l => endId(l.target) === id).sort((a, b) => b.n - a.n)
  return { out, inn }
}

function recolorArrows(root) {
  root.querySelectorAll('use').forEach(el => {
    const fill = el.getAttribute('fill')
    if (fill && el.style.fill !== fill) el.style.fill = fill
  })
}

export function mount(raw) {
  const chartEl = document.getElementById('chart')
  chartEl.replaceChildren()
  const legendEl = document.getElementById('legend')
  const titleEl = document.getElementById('detail-title')
  const metaEl = document.getElementById('detail-meta')
  const listEl = document.getElementById('detail-list')
  const clearBtn = document.getElementById('clear')
  const zoomEl = document.getElementById('zoomlabel')
  const throughEl = document.getElementById('through')
  const state = { focus: null, raw, graph: null, chart: null, links: [], maxN: 1, sizing: null }

  throughEl.textContent = `Data through ${niceDate(raw.data_through)} · copied messages from ${niceDate(raw.window_start)} to ${niceDate(raw.data_through)}`

  const activeNode = (id) => {
    const f = state.focus
    if (!f) return true
    if (f.type === 'node') {
      if (id === f.id) return true
      return state.links.some(l => (endId(l.source) === f.id && endId(l.target) === id) || (endId(l.target) === f.id && endId(l.source) === id))
    }
    return id === f.source || id === f.target
  }
  const activeLink = (l) => {
    const f = state.focus
    if (!f) return true
    const s = endId(l.source), t = endId(l.target)
    if (f.type === 'node') return s === f.id || t === f.id
    return s === f.source && t === f.target
  }

  const cfg = {
    layoutType: 'precalculated',
    layoutAutofit: false,
    fitViewPadding: 0,
    disableDrag: true,
    disableBrush: true,
    disableZoom: false,
    zoomScaleExtent: [1, 2.75],
    duration: reduceMotion ? 0 : 180,
    nodeSize: n => n.size,
    nodeShape: 'circle',
    nodeFill: n => activeNode(n.id) ? n.color : rgba(n.color, 0.28),
    nodeStroke: '#0b1526',
    nodeStrokeWidth: 3,
    nodeLabel: n => n.label,
    nodeSubLabel: n => n.subLabel,
    nodeLabelTrim: false,
    nodeSubLabelTrim: false,
    nodeLabelFitMode: 'wrap',
    nodeSubLabelFitMode: 'wrap',
    nodeLabelWidth: 148,
    nodeSubLabelWidth: 156,
    nodeSelectionHighlightMode: 'none',
    selectedNodeIds: [],
    linkWidth: l => linkWidth(l.n, state.maxN),
    linkStroke: l => activeLink(l) ? sourceColor(l) : rgba(sourceColor(l), 0.16),
    linkCurvature: 0.72,
    linkNeighborSpacing: 18,
    linkArrow: 'single',
    linkBandWidth: 0,
    linkHighlightOnHover: true,
    linkFlow: l => !reduceMotion && l.n >= FLOW_DOT_MIN && activeLink(l),
    linkFlowParticleSize: 3.2,
    linkFlowParticleSpeed: 36,
    panels: [],
    onZoom: (k) => { zoomEl.textContent = `Zoom ${Math.round(k * 100)}%` },
    onRenderComplete: () => {
      recolorArrows(chartEl)
      if (!state.needsHome || !state.graph) return
      state.needsHome = false
      state.graph._zoomBehavior.transform(state.graph.g, zoomIdentity)
      zoomEl.textContent = 'Zoom 100%'
    },
  }

  function paint() {
    if (!state.chart) return
    const f = state.focus
    cfg.selectedNodeIds = !f ? [] : f.type === 'node' ? [f.id] : [f.source, f.target]
    state.chart.updateComponent(cfg)
    drawDetail()
    for (const btn of legendEl.querySelectorAll('button')) {
      const on = f && f.type === 'node' && btn.dataset.id === f.id
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
  }

  function line(l) {
    const s = groupOf(endId(l.source)), t = groupOf(endId(l.target))
    return `<li><span class="swatch" style="background:${s.color}"></span> ${escapeHtml(s.short)} → <span class="swatch" style="background:${t.color}"></span> ${escapeHtml(t.short)} <b>${l.n.toLocaleString('en-US')}</b></li>`
  }

  function drawDetail() {
    const f = state.focus
    clearBtn.hidden = !f
    if (!f) {
      const top = [...state.links].sort((a, b) => b.n - a.n)[0]
      const total = state.links.reduce((a, l) => a + l.n, 0)
      titleEl.textContent = 'All groups'
      metaEl.textContent = `${state.links.length} routes of ${MIN_FLOW} or more messages, ${total.toLocaleString('en-US')} messages in all. Click a group to see only its routes.`
      listEl.innerHTML = top ? `<li>Busiest route: ${line(top).replace(/^<li>|<\/li>$/g, '')}</li>` : ''
      return
    }
    if (f.type === 'link') {
      const s = groupOf(f.source), t = groupOf(f.target)
      const n = state.links.find(l => endId(l.source) === f.source && endId(l.target) === f.target)
      titleEl.textContent = `${s.short} → ${t.short}`
      metaEl.textContent = `${(n ? n.n : 0).toLocaleString('en-US')} messages posted first by ${s.name} and later copied by ${t.name}.`
      listEl.innerHTML = ''
      return
    }
    const g = groupOf(f.id)
    const node = state.sizing.nodes.find(n => n.id === f.id)
    const { out, inn } = routesFor(state.links, f.id)
    const sum = rows => rows.reduce((a, l) => a + l.n, 0)
    titleEl.textContent = g.name
    metaEl.textContent = node
      ? `${node.channels.toLocaleString('en-US')} channels · ${node.posts.toLocaleString('en-US')} posts · base: ${g.base}. ${sum(out).toLocaleString('en-US')} posted first · ${sum(inn).toLocaleString('en-US')} copied from other groups.`
      : g.name
    if (!out.length && !inn.length) {
      listEl.innerHTML = `<li>No copied messages of ${MIN_FLOW} or more in this window.</li>`
      return
    }
    listEl.innerHTML =
      (out.length ? `<li class="hd">Posted first</li>` + out.map(line).join('') : '') +
      (inn.length ? `<li class="hd">Copied from others</li>` + inn.map(line).join('') : '')
  }

  function focusNode(id) {
    if (state.focus && state.focus.type === 'node' && state.focus.id === id) state.focus = null
    else state.focus = { type: 'node', id }
    paint()
  }
  function focusLink(l) {
    const source = endId(l.source), target = endId(l.target)
    state.focus = { type: 'link', source, target }
    paint()
  }
  function clearFocus() {
    state.focus = null
    paint()
  }

  legendEl.innerHTML = GROUPS.map(g =>
    `<button type="button" data-id="${g.id}" aria-pressed="false"><i style="background:${g.color}"></i>${escapeHtml(g.short)}</button>`
  ).join('')
  legendEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (btn) focusNode(btn.dataset.id)
  })
  clearBtn.addEventListener('click', clearFocus)

  function currentSize() {
    const width = Math.max(280, chartEl.clientWidth)
    const height = chartEl.clientHeight || (matchMedia('(max-width: 700px)').matches ? 720 : 640)
    return { width, height }
  }

  function renderGraph() {
    const { width, height } = currentSize()
    if (state.sizing && state.sizing.width === width && state.sizing.height === height && state.chart) return
    const data = toGraphData(raw, width, height)
    state.links = data.links
    state.maxN = data.maxN
    state.sizing = { width, height, nodes: data.nodes }
    state.needsHome = true
    if (!state.chart) {
      const graph = new Graph(cfg)
      state.graph = graph
      const tooltip = new Tooltip({
        followCursor: true,
        triggers: {
          [Graph.selectors.node]: (d) => {
            const { out, inn } = routesFor(state.links, d.id)
            const sum = rows => rows.reduce((a, l) => a + l.n, 0)
            return `<div class="tip"><b style="color:${d.color}">${escapeHtml(d.name)}</b><br>${d.channels.toLocaleString('en-US')} channels · ${escapeHtml(d.base)}<br>${sum(out).toLocaleString('en-US')} posted first · ${sum(inn).toLocaleString('en-US')} copied</div>`
          },
          [Graph.selectors.link]: (d) => {
            const s = groupOf(endId(d.source)), t = groupOf(endId(d.target))
            return `<div class="tip"><b style="color:${s.color}">${escapeHtml(s.short)}</b> → <b style="color:${t.color}">${escapeHtml(t.short)}</b><br>${d.n.toLocaleString('en-US')} messages copied</div>`
          },
        },
      })
      state.chart = new SingleContainer(chartEl, {
        component: graph,
        tooltip,
        duration: cfg.duration,
        ariaLabel: 'Network of copied messages between Axis groups, last 30 days. Line color is the group that posted first.',
      }, { nodes: data.nodes, links: data.links })
      graph.events[Graph.selectors.node].click = (d) => focusNode(d.id)
      graph.events[Graph.selectors.link].click = (d) => focusLink(d)
      graph.events[Graph.selectors.background].click = () => clearFocus()
    } else {
      state.chart.setData({ nodes: data.nodes, links: data.links })
    }
    drawDetail()
  }

  document.getElementById('zin').addEventListener('click', () => state.graph && state.graph.zoomIn(0.35))
  document.getElementById('zout').addEventListener('click', () => state.graph && state.graph.zoomOut(0.25))
  document.getElementById('zreset').addEventListener('click', () => {
    state.focus = null
    state.needsHome = true
    if (state.graph) state.graph._zoomBehavior.transform(state.graph.g, zoomIdentity)
    paint()
    zoomEl.textContent = 'Zoom 100%'
  })

  renderGraph()
  const ro = new ResizeObserver(() => renderGraph())
  ro.observe(chartEl)
}

const chartEl = typeof document !== 'undefined' && document.getElementById('chart')
if (chartEl) {
  fetch(new URL('data.json', document.baseURI))
    .then(r => {
      if (!r.ok) throw new Error('data.json ' + r.status)
      return r.json()
    })
    .then(mount)
    .catch(err => {
      chartEl.textContent = 'The network data did not load. Refresh the page.'
      console.error(err)
    })
}
