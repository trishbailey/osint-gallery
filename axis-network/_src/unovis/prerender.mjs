// Static SVG fallback via @unovis/ssr@1.8.0. The interactive page uses @unovis/ts.
// Do not import @unovis/ts here: the SSR package loads it after its DOM shims.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToSvg } from '@unovis/ssr'
import { zoomIdentity } from 'd3-zoom'
import { LAND, toGraphData, linkWidth } from './model.mjs'

const THEME = {
  '--vis-font-family': 'Segoe UI, system-ui, sans-serif',
  '--vis-graph-node-label-font-size': '14px',
  '--vis-graph-node-sublabel-font-size': '13px',
  '--vis-graph-node-label-background': '#12203a',
  '--vis-graph-node-label-text-color': '#e6e9ef',
  '--vis-graph-node-sublabel-text-color': '#d5deea',
  '--vis-dark-graph-node-label-background': '#12203a',
  '--vis-dark-graph-node-label-text-color': '#e6e9ef',
  '--vis-dark-graph-node-sublabel-text-color': '#d5deea',
  '--vis-graph-node-stroke-color': '#0b1526',
  '--vis-graph-node-selection-color': '#f4f1e4',
  '--vis-graph-link-stroke-opacity': '1',
  '--vis-graph-link-support-stroke-width': '16px',
}

export async function prerender({ dataPath, htmlPath, width = 1040, height = 640 }) {
  const raw = JSON.parse(readFileSync(dataPath, 'utf8'))
  const data = toGraphData(raw, width, height)
  const { svg, warnings } = await renderToSvg({
    width,
    height,
    theme: 'light',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  }, (ctx) => {
    for (const [key, value] of Object.entries(THEME)) ctx.container.style.setProperty(key, value)
    const { Graph, SingleContainer } = ctx.unovis
    let graph
    const cfg = {
      layoutType: 'precalculated',
      layoutAutofit: false,
      fitViewPadding: 0,
      disableDrag: true,
      disableBrush: true,
      disableZoom: true,
      duration: 0,
      nodeSize: n => n.size,
      nodeFill: n => n.color,
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
      linkWidth: l => linkWidth(l.n, data.maxN),
      linkStroke: l => {
        const id = l.source && l.source.id ? l.source.id : l.source
        const node = data.nodes.find(n => n.id === id)
        return node ? node.color : '#e6e9ef'
      },
      linkCurvature: 0.72,
      linkNeighborSpacing: 18,
      linkArrow: 'single',
      linkBandWidth: 0,
      linkFlow: false,
      panels: [],
      onRenderComplete: () => {
        if (graph && graph._zoomBehavior) graph._zoomBehavior.transform(graph.g, zoomIdentity)
        ctx.onRenderComplete()
      },
    }
    graph = new Graph(cfg)
    return new SingleContainer(ctx.container, {
      component: graph,
      width,
      height,
      duration: 0,
      ariaLabel: 'Network of copied messages between Axis groups',
    }, { nodes: data.nodes, links: data.links })
  })
  if (warnings && warnings.length) console.warn(warnings.join('\n'))
  // Drop XML prologue so the SVG can sit inside the page.
  let inline = svg.replace(/<\?xml[^>]*>\s*/, '').replace(/<svg\b([^>]*?)\srole="img"/, '<svg class="ssr-graph"$1 role="img" aria-label="Static copy of the Axis network graph"')
  // Arrow markers pick up one shared stroke variable. Paint each arrow with its own link color.
  inline = inline.replace(/<use ([^>]*?)fill="(#[0-9A-Fa-f]{3,8})"([^>]*?)style="fill:\s*#[0-9A-Fa-f]{3,8};/g, '<use $1fill="$2"$3style="fill: $2;')
  const frame = data.frame
  const geo = `translate(${frame.tx},${frame.ty}) scale(${frame.scale}) translate(${-frame.vx},${-frame.vy})`
  const land = LAND.map(d => `<path d="${d}" fill="#16284a" stroke="#2c4370" stroke-width="1.15" vector-effect="non-scaling-stroke"/>`).join('')
  const leaders = data.nodes.filter(n => n.nudged).map(n =>
    `<line x1="${n.anchorX}" y1="${n.anchorY}" x2="${n.x}" y2="${n.y}" stroke="${n.color}" stroke-width="1.5"/>` +
    `<circle cx="${n.anchorX}" cy="${n.anchorY}" r="3.5" fill="${n.color}" stroke="#0b1526" stroke-width="1.5"/>`
  ).join('')
  const base = `<svg class="ssr-land basemap" data-ci-ignore="basemap" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><g class="basemap" transform="${geo}">${land}</g>${leaders}</svg>`
  inline = `<div class="ssr-stage">${base}${inline}</div>`
  const html = readFileSync(htmlPath, 'utf8')
  const next = html.replace(/<!--SSR_START-->[\s\S]*?<!--SSR_END-->/, `<!--SSR_START-->\n${inline}\n<!--SSR_END-->`)
  if (next === html) throw new Error('SSR markers missing in ' + htmlPath)
  writeFileSync(htmlPath, next)
  console.log('ssr svg', inline.length, 'links', data.links.length, 'nodes', data.nodes.length)
  if (data.links.length < 1 || data.nodes.length !== 7) throw new Error('unexpected graph shape')
  if (data.links.some(l => l.n < 10)) throw new Error('flow under 10 slipped in')
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const repo = path.resolve(here, '../../..')
  prerender({
    dataPath: path.join(repo, 'axis-network/data.json'),
    htmlPath: path.join(repo, 'axis-network/unovis-preview.html'),
  }).then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
