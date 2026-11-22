import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'

if (!existsSync('data/snapshot/manifest.json')) {
  console.log('snapshot not ready, renderer will show the load error until fetch-data finishes')
} else {
  rmSync('public/snapshot', { recursive: true, force: true })
  mkdirSync('public', { recursive: true })
  cpSync('data/snapshot', 'public/snapshot', { recursive: true })
  console.log('staged snapshot into public/snapshot')
}
