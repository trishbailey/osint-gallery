// Group names, colors, and home bases copied from axis-network/_src/gen_page.py
// (the G table and the LOC table inside netmap). Counts always come from data.json.
// Land shapes and the projection are axis-network/_src/basemap.json, the same plate the live map draws.

import basemap from '../basemap.json' with { type: 'json' }

export const MIN_FLOW = 10
export const FLOW_DOT_MIN = 200
export const LAND = basemap.paths

export const GROUPS = [
  { id: 'houthi', name: 'Houthis (Ansar Allah)', short: 'Houthis', color: '#b24762', lon: 44.2, lat: 15.35, base: 'Sanaa' },
  { id: 'irgc', name: 'IRGC and Iranian state', short: 'IRGC and Iran', color: '#6e9a52', lon: 51.39, lat: 35.69, base: 'Tehran' },
  { id: 'hezbollah', name: 'Hezbollah', short: 'Hezbollah', color: '#c9a75a', lon: 35.5, lat: 33.89, base: 'Beirut' },
  { id: 'hamas', name: 'Hamas and allied media', short: 'Hamas', color: '#3f9c96', lon: 33.6, lat: 30.6, base: 'Gaza' },
  { id: 'iraqi', name: 'Iraqi militias', short: 'Iraqi militias', color: '#4379a8', lon: 44.36, lat: 33.31, base: 'Baghdad' },
  // Pro-Axis outlets have no single base. The live map places them at 27.5E, 25.5N,
  // and shifts that spot to 38.5E, 24.5N on a phone so it stays inside the cropped view.
  { id: 'aligned', name: 'Pro-Axis news outlets', short: 'Pro-Axis media', color: '#8e65b8', lon: 27.5, lat: 25.5, phoneLon: 38.5, phoneLat: 24.5, base: 'regional' },
  { id: 'pij', name: 'Palestinian Islamic Jihad (PIJ)', short: 'PIJ', color: '#b36a34', lon: 34.3, lat: 28.2, base: 'Gaza' },
]

const BY_ID = Object.fromEntries(GROUPS.map(g => [g.id, g]))

const MAP = { W: 1100, H: 620, lat0: 13, S: 24.21875, K: 0.8910065241883679, lonc: 40 }

export function groupOf(id) { return BY_ID[id] }

export function endId(v) {
  if (v && typeof v === 'object') return v.id
  return v
}

export function nodePixelSize(channels) {
  return Math.round(36 + 16 * Math.sqrt((channels || 1) / 25))
}

function project(lon, lat) {
  return [
    MAP.W / 2 + (lon - MAP.lonc) * MAP.K * MAP.S,
    MAP.H - (lat - MAP.lat0) * MAP.S,
  ]
}

// Same window the live map uses: the full plate on a desktop, a tighter crop on a phone.
export function mapFrame(width, height) {
  const phone = width < 700
  const vx = phone ? 240 : 0
  const vy = phone ? 20 : 0
  const vw = phone ? 760 : MAP.W
  const vh = phone ? 640 : MAP.H
  const scale = Math.min(width / vw, height / vh)
  return {
    phone, vx, vy, vw, vh, scale,
    tx: (width - vw * scale) / 2,
    ty: (height - vh * scale) / 2,
  }
}

export function toScreen(frame, mapX, mapY) {
  return [
    frame.tx + (mapX - frame.vx) * frame.scale,
    frame.ty + (mapY - frame.vy) * frame.scale,
  ]
}

// Circles stay on the projected city. If two circles overlap (Hamas and PIJ, both Gaza),
// nudge them apart by only as much as the circles need, and keep the real spot for a leader.
const MAX_NUDGE = 36
function place(nodes, width, height) {
  const frame = mapFrame(width, height)
  const phone = frame.phone
  for (const n of nodes) {
    const lon = phone && n.phoneLon != null ? n.phoneLon : n.lon
    const lat = phone && n.phoneLat != null ? n.phoneLat : n.lat
    const [mx, my] = project(lon, lat)
    const [x, y] = toScreen(frame, mx, my)
    n.x = n.anchorX = x
    n.y = n.anchorY = y
  }
  for (let iter = 0; iter < 8; iter++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        let dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 0.01
        const need = a.size / 2 + b.size / 2 + 6
        if (dist >= need) continue
        const push = (need - dist) / 2
        dx /= dist; dy /= dist
        a.x -= dx * push; a.y -= dy * push
        b.x += dx * push; b.y += dy * push
        moved = true
      }
    }
    if (!moved) break
  }
  for (const n of nodes) {
    const dx = n.x - n.anchorX, dy = n.y - n.anchorY
    const dist = Math.hypot(dx, dy)
    if (dist > MAX_NUDGE) {
      n.x = n.anchorX + dx / dist * MAX_NUDGE
      n.y = n.anchorY + dy / dist * MAX_NUDGE
    }
    n.nudged = Math.hypot(n.x - n.anchorX, n.y - n.anchorY) > 1.5
  }
  return frame
}

export function toGraphData(raw, width, height) {
  const flows = (raw.flow30 || []).filter(r => r[2] >= MIN_FLOW)
  const maxN = flows.reduce((m, r) => Math.max(m, r[2]), 1)
  const nodes = GROUPS.map(g => {
    const bg = (raw.by_group && raw.by_group[g.id]) || { ch: 0, posts: 0 }
    const ch = Number(bg.ch) || 0
    const sub = `${ch.toLocaleString('en-US')} channel${ch === 1 ? '' : 's'} · ${g.base}`
    const phone = width < 700
    return {
      id: g.id,
      label: g.short,
      // A phone is too narrow for the two-line chip. The city and channel count stay in the tooltip.
      subLabel: phone ? '' : sub,
      name: g.name,
      color: g.color,
      base: g.base,
      lon: g.lon,
      lat: g.lat,
      phoneLon: g.phoneLon,
      phoneLat: g.phoneLat,
      channels: bg.ch || 0,
      posts: bg.posts || 0,
      size: nodePixelSize(bg.ch || 1),
    }
  })
  const frame = place(nodes, width, height)
  const links = flows.map(([source, target, n]) => ({ source, target, n }))
  return {
    nodes,
    links,
    frame,
    maxN,
    through: raw.data_through,
    windowStart: raw.window_start,
    xcopies: raw.xcopies30,
  }
}

export function linkWidth(n, maxN) {
  return 1.4 + 6.2 * Math.sqrt(n / maxN)
}

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function niceDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}
