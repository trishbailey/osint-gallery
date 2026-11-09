// Group names, colors, and home bases copied from axis-network/_src/gen_page.py
// (the G table and the LOC table inside netmap). Counts always come from data.json.
// Projection constants are basemap.json (W, H, lat0, S, K, lonc), the same ones the live map uses.

export const MIN_FLOW = 10
export const FLOW_DOT_MIN = 200

export const GROUPS = [
  { id: 'houthi', name: 'Houthis (Ansar Allah)', short: 'Houthis', color: '#b24762', lon: 44.2, lat: 15.35, base: 'Sanaa' },
  { id: 'irgc', name: 'IRGC and Iranian state', short: 'IRGC and Iran', color: '#6e9a52', lon: 51.39, lat: 35.69, base: 'Tehran' },
  { id: 'hezbollah', name: 'Hezbollah', short: 'Hezbollah', color: '#c9a75a', lon: 35.5, lat: 33.89, base: 'Beirut' },
  { id: 'hamas', name: 'Hamas and allied media', short: 'Hamas', color: '#3f9c96', lon: 33.6, lat: 30.6, base: 'Gaza' },
  { id: 'iraqi', name: 'Iraqi militias', short: 'Iraqi militias', color: '#4379a8', lon: 44.36, lat: 33.31, base: 'Baghdad' },
  { id: 'aligned', name: 'Pro-Axis news outlets', short: 'Pro-Axis media', color: '#8e65b8', lon: 27.5, lat: 25.5, base: 'regional' },
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

function textWidth(text, px) {
  return Math.ceil(text.length * px * 0.62)
}

// Home-base positions, then a push so a label never sits on the next circle.
// Gaza (Hamas and PIJ) is the tight pair on the live map.
function place(nodes, width, height) {
  const metrics = (n) => {
    const half = Math.max(n.size / 2 + 12, textWidth(n.label, 14) / 2 + 10, textWidth(n.subLabel, 13) / 2 + 10)
    return { half, above: n.size / 2 + 16, below: n.size / 2 + 62 }
  }
  const widest = Math.max(...nodes.map(n => metrics(n).half))
  const padX = Math.max(widest + 6, 16)
  const padTop = 36
  const padBottom = 86
  const innerW = Math.max(40, width - padX * 2)
  const innerH = Math.max(80, height - padTop - padBottom)
  const raw = nodes.map(n => project(n.lon, n.lat))
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of raw) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  nodes.forEach((n, i) => {
    n.x = padX + ((raw[i][0] - minX) / spanX) * innerW
    n.y = padTop + ((raw[i][1] - minY) / spanY) * innerH
  })
  const clamp = (n) => {
    const m = metrics(n)
    n.x = Math.max(m.half + 2, Math.min(width - m.half - 2, n.x))
    n.y = Math.max(m.above + 2, Math.min(height - m.below - 2, n.y))
  }
  for (let iter = 0; iter < 200; iter++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const ma = metrics(a), mb = metrics(b)
        let dx = b.x - a.x
        let dy = b.y - a.y
        const top = a.y <= b.y ? a : b
        const bot = top === a ? b : a
        const mt = metrics(top), mdn = metrics(bot)
        const needX = ma.half + mb.half + 8
        const needY = mt.below + mdn.above + 6
        const ox = needX - Math.abs(dx)
        const oy = needY - Math.abs(dy)
        const dist = Math.hypot(dx, dy) || 0.01
        const minDist = Math.min(132, Math.max(96, width * 0.18))
        if (ox > 0 && oy > 0) {
          moved = true
          if (ox * 0.65 < oy) {
            const s = Math.sign(dx) || (i % 2 ? 1 : -1)
            a.x -= s * (ox / 2 + 0.5)
            b.x += s * (ox / 2 + 0.5)
          } else {
            const s = Math.sign(dy) || 1
            a.y -= s * (oy / 2 + 0.5)
            b.y += s * (oy / 2 + 0.5)
          }
        } else if (dist < minDist && Math.abs(dy) < needY * 0.9) {
          moved = true
          dx /= dist; dy /= dist
          const push = (minDist - dist) / 2
          a.x -= dx * push; a.y -= dy * push
          b.x += dx * push; b.y += dy * push
        }
      }
    }
    nodes.forEach(clamp)
    if (!moved) break
  }
}

export function toGraphData(raw, width, height) {
  const flows = (raw.flow30 || []).filter(r => r[2] >= MIN_FLOW)
  const maxN = flows.reduce((m, r) => Math.max(m, r[2]), 1)
  const nodes = GROUPS.map(g => {
    const bg = (raw.by_group && raw.by_group[g.id]) || { ch: 0, posts: 0 }
    const ch = Number(bg.ch) || 0
    const sub = `${ch.toLocaleString('en-US')} channel${ch === 1 ? '' : 's'} · ${g.base}`
    return {
      id: g.id,
      label: g.short,
      subLabel: sub,
      name: g.name,
      color: g.color,
      base: g.base,
      lon: g.lon,
      lat: g.lat,
      channels: bg.ch || 0,
      posts: bg.posts || 0,
      size: nodePixelSize(bg.ch || 1),
    }
  })
  place(nodes, width, height)
  const links = flows.map(([source, target, n]) => ({ source, target, n }))
  return {
    nodes,
    links,
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
