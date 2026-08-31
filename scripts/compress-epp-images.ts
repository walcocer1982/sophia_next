/**
 * Comprime las 3 imágenes del curso EPPs a un tamaño razonable para web.
 * - Target: < 300 KB c/u (vs ~2 MB original)
 * - Max width: 1200px (suficiente para mostrar full-screen en el chat)
 * - Format: WebP con fallback PNG (mantenemos extensión .png para no romper
 *   las URLs ya en DB; el server detecta el tipo por contenido).
 */

import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const IMAGES_DIR = path.resolve(process.cwd(), 'public/cursos/epps')
const FILES = ['epp-taller.png', 'epp-respirador.png', 'epp-arnes.png']
const MAX_WIDTH = 1200
const QUALITY = 82 // sweet spot calidad/tamaño para PNG comprimido

async function compressOne(filename: string) {
  const filepath = path.join(IMAGES_DIR, filename)
  const before = (await fs.stat(filepath)).size

  // Mantener PNG (compresión sin pérdida con resize)
  const buffer = await sharp(filepath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ quality: QUALITY, compressionLevel: 9, palette: true })
    .toBuffer()

  await fs.writeFile(filepath, buffer)
  const after = (await fs.stat(filepath)).size
  const ratio = ((1 - after / before) * 100).toFixed(0)
  console.log(
    `  ${filename}: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB  (-${ratio}%)`,
  )
}

async function main() {
  console.log('🖼️ Comprimiendo imágenes EPPs...')
  for (const f of FILES) await compressOne(f)
  console.log('✅ Listo')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
