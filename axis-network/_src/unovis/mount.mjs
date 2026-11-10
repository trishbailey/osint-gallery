// Interactive Unovis pilot. Bundled to axis-network/unovis-preview.js.
// Imports only @unovis/ts (the SSR package renders the noscript fallback).

import { Graph } from '@unovis/ts/components/graph/index.js'
import { SingleContainer } from '@unovis/ts/containers/single-container/index.js'
import { Tooltip } from '@unovis/ts/components/tooltip/index.js'
import { zoomIdentity } from 'd3-zoom'
import {
  GROUPS, LAND, MIN_FLOW, isNarrow, mapFrame, endId, groupOf, toGraphData, linkWidth, rgba, niceDate,
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

const NS = 'http://www.w3.org/2000/svg'

function recolorArrows(root) {
  root.querySelectorAll('use').forEach(el => {
    const fill = el.getAttribute('fill')
    if (fill && el.style.fill !== fill) el.style.fill = fill
  })
}

// Live map: pale dots travel every route, more of them on the busier ones.
function paintFlowDots(root, maxN) {
  root.querySelectorAll('svg g').forEach(g => {
    const d = g.__data__
    if (!d || d.n == null) return
    const dots = [...g.querySelectorAll('circle')].filter(c => {
      const r = parseFloat(c.getAttribute('r'))
      return r > 0 && r < 6
    })
    if (!dots.length) return
    const keep = Math.max(1, Math.round(1 + 6 * Math.sqrt(d.n / maxN)))
    dots.forEach((c, i) => {
      c.style.fill = '#e6e9ef'
      c.style.fillOpacity = '0.9'
      c.style.display = i < keep ? '' : 'none'
    })
  })
}

// Where a label prefers to sit, as a direction away from its circle.
const LABEL_DIR = {
  houthi: [0, 1],
  irgc: [1, 0.15],
  hezbollah: [0, -1],
  iraqi: [1, 0.35],
  hamas: [-1, 0],
  pij: [1, 0.45],
  aligned: [-1, 0.15],
}
const PHONE_DIR = {
  houthi: [0, 1],
  irgc: [0.1, -1],
  hezbollah: [-0.7, -1],
  iraqi: [1, 0.1],
  hamas: [-0.2, 1],
  pij: [1, 1],
  aligned: [0.15, 1],
}

function drawBasemap(frame, nodes) {
  const svg = document.getElementById('basemap')
  const geo = `translate(${frame.tx},${frame.ty}) scale(${frame.scale}) translate(${-frame.vx},${-frame.vy})`
  const land = LAND.map(d => `<path d="${d}" fill="#16284a" stroke="#2c4370" stroke-width="1.15" vector-effect="non-scaling-stroke"/>`).join('')
  const leaders = nodes.filter(n => n.nudged).map(n =>
    `<line x1="${n.anchorX}" y1="${n.anchorY}" x2="${n.x}" y2="${n.y}" stroke="${n.color}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="${n.anchorX}" cy="${n.anchorY}" r="3.5" fill="${n.color}" stroke="#0b1526" stroke-width="1.5"/>`
  ).join('')
  svg.innerHTML =
    `<g id="basemap-zoom">` +
    `<g class="basemap" data-ci-ignore="basemap" transform="${geo}">${land}</g>` +
    `<g id="basemap-leaders">${leaders}</g></g>`
}

function syncBasemapZoom(transform) {
  const g = document.getElementById('basemap-zoom')
  if (g && transform) g.setAttribute('transform', transform.toString())
}

// Fixed chips on a phone, in the open water around the cities, so the circles stay put.
function phoneLabelBox(item, stage) {
  const { id, w, h, origin, node } = item
  const r = node.size / 2
  const left = stage.left + 6
  const right = stage.right - 6 - w
  let x = origin.x - w / 2
  let y = origin.y + r + 10
  if (id === 'irgc' || id === 'hezbollah') y = origin.y - r - h - 16
  if (id === 'hezbollah') x = left
  if (id === 'irgc') x = Math.min(right, origin.x - w * 0.35)
  if (id === 'hamas') { x = left; y = origin.y - r - h - 6 }
  if (id === 'iraqi') { x = right; y = origin.y + 4 }
  if (id === 'pij') { x = left; y = origin.y - r - h - 4 }
  if (id === 'aligned') { x = Math.max(left, origin.x - w / 2); y = origin.y + r + 18 }
  if (id === 'houthi') { x = origin.x - w / 2; y = origin.y + r + 12 }
  x = Math.min(Math.max(x, left), right)
  y = Math.min(Math.max(y, stage.top + 6), stage.bottom - 6 - h)
  return { x, y, w, h }
}

function localDelta(el, screenDx, screenDy) {
  const ctm = el.getScreenCTM()
  if (!ctm) return [screenDx, screenDy]
  const inv = ctm.inverse()
  const p0 = new DOMPoint(0, 0).matrixTransform(inv)
  const p1 = new DOMPoint(screenDx, screenDy).matrixTransform(inv)
  return [p1.x - p0.x, p1.y - p0.y]
}

function boxesOverlap(a, b, pad) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return x * y
}

// Keep Unovis label chips, but slide a chip when it would cover another chip or circle.
function layoutLabels(chartEl, nodes) {
  const stage = chartEl.getBoundingClientRect()
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  const items = []
  for (const g of chartEl.querySelectorAll('svg g')) {
    const datum = g.__data__
    if (!datum || !datum.id || !byId[datum.id]) continue
    if (!g.querySelector(':scope > circle')) continue
    const label = [...g.children].find(el => el.tagName === 'g' && el.querySelector('rect[rx]'))
    if (!label) continue
    const origin = new DOMPoint(0, 0).matrixTransform(g.getScreenCTM())
    const axis = new DOMPoint(1, 0).matrixTransform(g.getScreenCTM())
    const k = Math.hypot(axis.x - origin.x, axis.y - origin.y) || 1
    const chip = label.querySelector('rect')
    const w = parseFloat(chip.getAttribute('width')) || label.getBoundingClientRect().width
    const h = parseFloat(chip.getAttribute('height')) || label.getBoundingClientRect().height
    if (w < 8) continue
    items.push({ id: datum.id, g, label, w, h, node: byId[datum.id], origin, k })
  }
  if (!items.length) return
  const placed = []
  const bounds = { x: stage.left + 4, y: stage.top + 4, r: stage.right - 4, b: stage.bottom - 4 }
  const phone = isNarrow(stage.width)
  for (const item of items) {
    const n = item.node
    let best = null
    if (phone) best = { box: phoneLabelBox(item, stage) }
    const prefer = (phone ? PHONE_DIR : LABEL_DIR)[n.id] || [0, 1]
    const dirs = [prefer, [0, 1], [0, -1], [-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]
    if (!phone) dirs.forEach((dir, index) => {
      const len = Math.hypot(dir[0], dir[1]) || 1
      const ux = dir[0] / len, uy = dir[1] / len
      const along = Math.abs(ux) * item.w / 2 + Math.abs(uy) * item.h / 2
      const dist = (n.size / 2 + 12) * item.k + along
      const cx = item.origin.x + ux * dist
      const cy = item.origin.y + uy * dist
      const box = { x: cx - item.w / 2, y: cy - item.h / 2, w: item.w, h: item.h }
      let penalty = index * 6
      penalty += Math.max(0, bounds.x - box.x) * 80
      penalty += Math.max(0, bounds.y - box.y) * 80
      penalty += Math.max(0, box.x + box.w - bounds.r) * 80
      penalty += Math.max(0, box.y + box.h - bounds.b) * 80
      for (const other of placed) penalty += overlapArea(box, other.box) * 4
      for (const other of items) {
        if (other.id === n.id) continue
        const nx = other.origin.x, ny = other.origin.y
        const rr = (other.node.size / 2 + 4) * item.k
        const nearX = Math.max(box.x, Math.min(nx, box.x + box.w))
        const nearY = Math.max(box.y, Math.min(ny, box.y + box.h))
        const dd = Math.hypot(nx - nearX, ny - nearY)
        if (dd < rr) penalty += (rr - dd) * 220
      }
      if (!best || penalty < best.penalty) best = { box, penalty, ux, uy }
    })
    if (!best) best = { box: { x: item.origin.x, y: item.origin.y, w: item.w, h: item.h } }
    // Pull the chosen box back inside the chart.
    best.box.x = Math.min(Math.max(best.box.x, bounds.x), bounds.r - best.box.w)
    best.box.y = Math.min(Math.max(best.box.y, bounds.y), bounds.b - best.box.h)
    item.g.__originX = item.origin.x
    item.g.__originY = item.origin.y
    placed.push({ id: n.id, box: best.box, node: n, label: item.label, g: item.g })
  }
  // A last push if two chosen boxes still touch. Phone spots are already separated.
  for (let iter = 0; iter < (phone ? 0 : 24); iter++) {
    let moved = false
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i].box, b = placed[j].box
        if (!boxesOverlap(a, b, 6)) continue
        const acx = a.x + a.w / 2, acy = a.y + a.h / 2
        const bcx = b.x + b.w / 2, bcy = b.y + b.h / 2
        const ox = (a.w + b.w) / 2 + 6 - Math.abs(bcx - acx)
        const oy = (a.h + b.h) / 2 + 6 - Math.abs(bcy - acy)
        if (ox <= 0 || oy <= 0) continue
        moved = true
        if (ox < oy) {
          const s = Math.sign(bcx - acx) || 1
          a.x -= s * ox / 2; b.x += s * ox / 2
        } else {
          const s = Math.sign(bcy - acy) || 1
          a.y -= s * oy / 2; b.y += s * oy / 2
        }
      }
    }
    for (const p of placed) {
      p.box.x = Math.min(Math.max(p.box.x, bounds.x), bounds.r - p.box.w)
      p.box.y = Math.min(Math.max(p.box.y, bounds.y), bounds.b - p.box.h)
    }
    if (!moved) break
  }
  const stageBox = document.getElementById('stage').getBoundingClientRect()
  const host = document.getElementById('chips')
  const wires = document.getElementById('wires')
  const lines = []
  for (const p of placed) {
    p.label.style.display = 'none'
    let chip = document.getElementById('chip-' + p.id)
    if (!chip) {
      chip = document.createElement('div')
      chip.id = 'chip-' + p.id
      chip.className = 'chip-label'
      chip.innerHTML = `<b>${escapeHtml(p.node.label)}</b>` + (p.node.subLabel ? `<span>${escapeHtml(p.node.subLabel)}</span>` : '')
      host.appendChild(chip)
    }
    let left = p.box.x - stageBox.left
    let top = p.box.y - stageBox.top
    chip.style.left = left + 'px'
    chip.style.top = top + 'px'
    const cw = chip.offsetWidth
    const ch = chip.offsetHeight
    const nx = p.g.__originX - stageBox.left
    const ny = p.g.__originY - stageBox.top
    const rr = p.node.size / 2 + 3
    const hits = (x, y) => {
      const nearX = Math.max(x, Math.min(nx, x + cw))
      const nearY = Math.max(y, Math.min(ny, y + ch))
      return Math.hypot(nx - nearX, ny - nearY) < rr
    }
    if (hits(left, top)) {
      const below = ny + rr + 2
      const above = ny - rr - ch - 2
      top = below + ch <= stageBox.height - 4 ? below : above
    }
    left = Math.min(Math.max(4, left), Math.max(4, stageBox.width - cw - 4))
    top = Math.min(Math.max(4, top), Math.max(4, stageBox.height - ch - 4))
    chip.style.left = left + 'px'
    chip.style.top = top + 'px'
    const tx = left + cw / 2
    const ty = top + ch / 2
    const dist = Math.hypot(tx - nx, ty - ny)
    if (dist < p.node.size / 2 + 16) continue
    const ux = (tx - nx) / dist, uy = (ty - ny) / dist
    const reach = Math.abs(ux) * cw / 2 + Math.abs(uy) * ch / 2
    lines.push(`<line x1="${nx + ux * (p.node.size / 2 + 2)}" y1="${ny + uy * (p.node.size / 2 + 2)}" x2="${tx - ux * reach}" y2="${ty - uy * reach}" stroke="${p.node.color}" stroke-width="1.25" stroke-linecap="round"/>`)
  }
  wires.setAttribute('viewBox', `0 0 ${stageBox.width} ${stageBox.height}`)
  wires.innerHTML = lines.join('')
}

// Measured positions win over the plan: nudge until chips are inside the map and off each other.
function settleLabels(chartEl) {
  const stage = chartEl.getBoundingClientRect()
  const pad = 6
  const labels = () => [...chartEl.querySelectorAll('svg g')].flatMap(g => {
    if (!g.__data__ || !g.__data__.id || !g.querySelector(':scope > circle')) return []
    const label = [...g.children].find(el => el.tagName === 'g' && el.querySelector('rect[rx]'))
    if (!label) return []
    return [{ g, label, r: label.getBoundingClientRect(), node: g.__data__ }]
  })
  for (let pass = 0; pass < 16; pass++) {
    const items = labels()
    let moved = false
    for (const a of items) {
      let dx = 0, dy = 0
      for (const b of items) {
        if (a === b) continue
        const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        if (ox > 1 && oy > 1) {
          if (ox < oy) dx += (a.r.left + a.r.width / 2 < b.r.left + b.r.width / 2 ? -1 : 1) * (ox / 2 + 1)
          else dy += (a.r.top + a.r.height / 2 < b.r.top + b.r.height / 2 ? -1 : 1) * (oy / 2 + 1)
        }
      }
      const nextLeft = a.r.left + dx, nextRight = a.r.right + dx
      const nextTop = a.r.top + dy, nextBottom = a.r.bottom + dy
      if (nextLeft < stage.left + pad) dx += stage.left + pad - nextLeft
      if (nextRight > stage.right - pad) dx -= nextRight - (stage.right - pad)
      if (nextTop < stage.top + pad) dy += stage.top + pad - nextTop
      if (nextBottom > stage.bottom - pad) dy -= nextBottom - (stage.bottom - pad)
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      const [lx, ly] = localDelta(a.g, dx, dy)
      const prev = a.label.transform.baseVal.consolidate()
      a.label.setAttribute('transform', `translate(${(prev ? prev.matrix.e : 0) + lx},${(prev ? prev.matrix.f : 0) + ly})`)
      moved = true
    }
    if (!moved) break
  }
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
    nodeLabelWidth: 200,
    nodeSubLabelWidth: 210,
    nodeSelectionHighlightMode: 'none',
    selectedNodeIds: [],
    linkWidth: l => linkWidth(l.n, state.maxN),
    linkStroke: l => activeLink(l) ? sourceColor(l) : rgba(sourceColor(l), 0.16),
    linkCurvature: 0.72,
    linkNeighborSpacing: 18,
    linkArrow: 'single',
    linkBandWidth: 0,
    linkHighlightOnHover: true,
    // Pale dots on every shown route, same idea as the live map. Speed scales with volume.
    // Reduced motion keeps the dots and stops them.
    linkFlow: () => true,
    linkFlowParticleSize: 2.5,
    // Unovis treats a speed of 0 as "unset" and falls back to a moving duration, so a tiny speed is what actually holds the dots still.
    linkFlowParticleSpeed: l => reduceMotion ? 1e-6 : 22 + 55 * Math.sqrt(l.n / state.maxN),
    panels: [],
    onZoom: (k, _extent, _event, transform) => {
      zoomEl.textContent = `Zoom ${Math.round(k * 100)}%`
      syncBasemapZoom(transform)
      if (state.sizing) {
        layoutLabels(chartEl, state.sizing.nodes)
        paintFlowDots(chartEl, state.maxN)
      }
    },
    onRenderComplete: () => {
      recolorArrows(chartEl)
      if (state.maxN) paintFlowDots(chartEl, state.maxN)
      if (state.needsHome && state.graph) {
        state.needsHome = false
        state.graph._zoomBehavior.transform(state.graph.g, zoomIdentity)
        syncBasemapZoom(zoomIdentity)
        zoomEl.textContent = 'Zoom 100%'
      }
      if (state.sizing) layoutLabels(chartEl, state.sizing.nodes)
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

  function syncStage() {
    const stage = document.getElementById('stage')
    const width = stage.clientWidth
    if (!isNarrow(width)) {
      if (stage.style.height) stage.style.height = ''
      return
    }
    const { vw, vh } = mapFrame(width, width)
    const next = Math.round(width * vh / vw) + 'px'
    if (stage.style.height !== next) stage.style.height = next
  }

  function currentSize() {
    syncStage()
    const width = Math.max(280, chartEl.clientWidth)
    const height = chartEl.clientHeight || (isNarrow(width) ? Math.round(width * 620 / 530) : 700)
    return { width, height }
  }

  function renderGraph() {
    const { width, height } = currentSize()
    if (state.sizing && state.sizing.width === width && state.sizing.height === height && state.chart) return
    const data = toGraphData(raw, width, height)
    state.links = data.links
    state.maxN = data.maxN
    state.sizing = { width, height, nodes: data.nodes, frame: data.frame }
    state.needsHome = true
    drawBasemap(data.frame, data.nodes)
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
    syncBasemapZoom(zoomIdentity)
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
