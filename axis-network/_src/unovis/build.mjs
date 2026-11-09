// Rebuild the pilot bundle and the noscript SVG.
// Uses only @unovis/ts@1.8.0 and @unovis/ssr@1.8.0 (no @unovis/mcp).
//
//   cd /tmp && mkdir -p unovis-pilot && cd unovis-pilot
//   npm install @unovis/ts@1.8.0 @unovis/ssr@1.8.0 esbuild
//   UNOVIS_ROOT=/tmp/unovis-pilot node axis-network/_src/unovis/build.mjs
//
// Optional layout engines (elk, dagre, d3-force) stay out of the browser bundle.
// The pilot uses the precalculated layout, with home-base coordinates.

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../..')
const unovisRoot = process.env.UNOVIS_ROOT || '/tmp/unovis-pilot'
const require = createRequire(path.join(unovisRoot, 'package.json'))

for (const name of ['@unovis/ts', '@unovis/ssr']) {
  const version = require(name + '/package.json').version
  if (version !== '1.8.0') throw new Error(`${name}@${version} is installed; pin 1.8.0`)
}
const { build } = require('esbuild')

const modulesLink = path.join(here, 'node_modules')
if (!fs.existsSync(modulesLink)) fs.symlinkSync(path.join(unovisRoot, 'node_modules'), modulesLink)

const outfile = path.join(repo, 'axis-network/unovis-preview.js')
await build({
  absWorkingDir: here,
  entryPoints: ['mount.mjs'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile,
  minify: true,
  legalComments: 'inline',
  nodePaths: [path.join(unovisRoot, 'node_modules')],
  external: [
    'elkjs',
    'elkjs/lib/elk.bundled.js',
    '@unovis/graphlibrary',
    '@unovis/dagre-layout',
    'd3-force',
  ],
})

const run = spawnSync(process.execPath, [path.join(here, 'prerender.mjs')], {
  cwd: here,
  env: { ...process.env, NODE_PATH: path.join(unovisRoot, 'node_modules') },
  stdio: 'inherit',
})
if (fs.lstatSync(modulesLink, { throwIfNoEntry: false })?.isSymbolicLink()) fs.unlinkSync(modulesLink)
if (run.status) process.exit(run.status)
