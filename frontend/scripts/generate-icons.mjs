import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

const SAGE = '#457040'
const CREAM = '#fdfbf7'

// Simple plant/leaf mark, centered in a square, with generous padding so it
// still reads correctly once Android/iOS apply their own icon mask.
function svgIcon({ size, padding, bg }) {
  const inner = size - padding * 2
  const cx = size / 2
  const stemTop = padding + inner * 0.15
  const stemBottom = size - padding - inner * 0.05
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
  <g stroke="${CREAM}" stroke-width="${inner * 0.07}" stroke-linecap="round" fill="none">
    <line x1="${cx}" y1="${stemBottom}" x2="${cx}" y2="${stemTop}"/>
    <path d="M ${cx} ${stemTop + inner * 0.18} C ${cx - inner * 0.32} ${stemTop + inner * 0.05}, ${cx - inner * 0.4} ${stemTop + inner * 0.38}, ${cx} ${stemTop + inner * 0.42}"/>
    <path d="M ${cx} ${stemTop + inner * 0.38} C ${cx + inner * 0.32} ${stemTop + inner * 0.25}, ${cx + inner * 0.4} ${stemTop + inner * 0.58}, ${cx} ${stemTop + inner * 0.62}"/>
  </g>
</svg>`
}

async function build(size, filename, { padding = size * 0.12, bg = SAGE } = {}) {
  const svg = Buffer.from(svgIcon({ size, padding, bg }))
  await sharp(svg).png().toFile(path.join(publicDir, filename))
  console.log('wrote', filename)
}

await build(192, 'pwa-192x192.png')
await build(512, 'pwa-512x512.png')
// Maskable icons need extra safe-zone padding since the OS crops to a shape.
await build(512, 'pwa-maskable-512x512.png', { padding: 512 * 0.22 })
await build(180, 'apple-touch-icon.png', { padding: 180 * 0.16 })
await build(32, 'favicon.png', { padding: 32 * 0.1 })
