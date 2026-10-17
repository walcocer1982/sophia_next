/**
 * Genera la lámina «Cómo se arma tu nota» (SVG) y la sube a Cloudinary para
 * usarla como imagen de apoyo en EVA-NOTA (panel lateral del estudiante).
 *
 * Fuente de los pesos: Reglamento Interno v03 (Art. 52.8, nota mínima 13) y
 * diseño instruccional CETEMIN (§06): CV 10 % · EP 20 % · EF 20 % · TC1 25 % ·
 * TC2 25 %. El ejemplo resuelto (Pedro) está completo para que el estudiante
 * vea la fórmula entera antes de calcular él.
 *
 * Uso: npx tsx scripts/subir-formula-nota.ts        → imprime la URL
 *      npx tsx scripts/subir-formula-nota.ts --svg  → solo escribe el SVG local
 */
import { readFileSync, writeFileSync } from 'node:fs'

// tsx no carga .env (Prisma lo hace solo; Cloudinary no). Se leen aquí las
// variables CLOUDINARY_* antes de importar el cliente.
for (const linea of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = linea.match(/^(CLOUDINARY_[A-Z_]+)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

const AZUL = '#09222d'
const AMARILLO = '#fbc50b'
const GRIS = '#e9edf0'
const TEXTO = '#1f2a30'

// Ejemplo resuelto: Pedro
const filas = [
  { ev: 'CV (4 cuestionarios)', peso: 10, nota: 14, color: '#3b7ea1' },
  { ev: 'EP · Examen parcial', peso: 20, nota: 12, color: '#3b7ea1' },
  { ev: 'EF · Examen final', peso: 20, nota: 13, color: '#3b7ea1' },
  { ev: 'TC1 · Trabajo colaborativo 1', peso: 25, nota: 14, color: '#c48a00' },
  { ev: 'TC2 · Trabajo colaborativo 2', peso: 25, nota: 15, color: '#c48a00' },
]
const aporte = (f: { peso: number; nota: number }) => (f.nota * f.peso) / 100
const fmt = (n: number) => n.toFixed(2).replace(/\.?0+$/, '')
const total = filas.reduce((s, f) => s + aporte(f), 0)

function svg(): string {
  const W = 1200, H = 800
  const barX = 60, barW = 1080, barY = 120, barH = 70
  let x = barX
  const segmentos = filas.map((f) => {
    const w = (f.peso / 100) * barW
    const s = `<rect x="${x}" y="${barY}" width="${w}" height="${barH}" fill="${f.color}" stroke="white" stroke-width="3"/>
      <text x="${x + w / 2}" y="${barY + 30}" text-anchor="middle" font-size="22" font-weight="700" fill="white">${f.ev.split(' ·')[0].split(' (')[0]}</text>
      <text x="${x + w / 2}" y="${barY + 58}" text-anchor="middle" font-size="24" font-weight="700" fill="white">${f.peso} %</text>`
    x += w
    return s
  }).join('\n')

  const rowY0 = 340, rowH = 54
  const tabla = filas.map((f, i) => {
    const y = rowY0 + i * rowH
    return `<rect x="60" y="${y}" width="1080" height="${rowH}" fill="${i % 2 ? 'white' : GRIS}"/>
      <text x="80" y="${y + 35}" font-size="24" fill="${TEXTO}">${f.ev}</text>
      <text x="560" y="${y + 35}" font-size="24" text-anchor="middle" fill="${TEXTO}">${f.peso} %</text>
      <text x="760" y="${y + 35}" font-size="24" text-anchor="middle" fill="${TEXTO}">${f.nota}</text>
      <text x="960" y="${y + 35}" font-size="24" text-anchor="middle" fill="${TEXTO}">${f.nota} × ${f.peso} % = <tspan font-weight="700">${fmt(aporte(f))}</tspan></text>`
  }).join('\n')
  const yTot = rowY0 + filas.length * rowH

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">
  <rect width="${W}" height="${H}" fill="white"/>
  <rect x="0" y="0" width="${W}" height="80" fill="${AZUL}"/>
  <text x="60" y="52" font-size="34" font-weight="700" fill="white">Cómo se arma tu nota final (curso TP)</text>
  <text x="${W - 60}" y="52" font-size="22" text-anchor="end" fill="${AMARILLO}">Reglamento Interno v03 · mínimo 13</text>

  <text x="60" y="108" font-size="20" fill="${TEXTO}">Dos mitades: <tspan font-weight="700" fill="#3b7ea1">conocimiento 50 %</tspan> (CV + EP + EF) y <tspan font-weight="700" fill="#c48a00">habilidades 50 %</tspan> (TC1 + TC2). Cada nota aporta según su peso.</text>
  ${segmentos}
  <text x="60" y="235" font-size="22" fill="${TEXTO}">Fórmula: <tspan font-weight="700">nota final = CV × 10 % + EP × 20 % + EF × 20 % + TC1 × 25 % + TC2 × 25 %</tspan></text>
  <text x="60" y="268" font-size="20" fill="#5a6b73">Ejemplo resuelto — Pedro. Un trabajo NO entregado vale 0. Se aprueba con 13 (12,5 redondea a 13).</text>

  <rect x="60" y="${rowY0 - 44}" width="1080" height="44" fill="${AZUL}"/>
  <text x="80" y="${rowY0 - 14}" font-size="22" font-weight="700" fill="white">Evento</text>
  <text x="560" y="${rowY0 - 14}" font-size="22" font-weight="700" fill="white" text-anchor="middle">Peso</text>
  <text x="760" y="${rowY0 - 14}" font-size="22" font-weight="700" fill="white" text-anchor="middle">Nota de Pedro</text>
  <text x="960" y="${rowY0 - 14}" font-size="22" font-weight="700" fill="white" text-anchor="middle">Aporte</text>
  ${tabla}
  <rect x="60" y="${yTot}" width="1080" height="${rowH}" fill="${AMARILLO}"/>
  <text x="80" y="${yTot + 35}" font-size="24" font-weight="700" fill="${AZUL}">Nota final de Pedro (suma de aportes)</text>
  <text x="960" y="${yTot + 35}" font-size="26" font-weight="700" text-anchor="middle" fill="${AZUL}">${fmt(total)} → ${Math.round(total)}</text>

  <text x="60" y="${yTot + 100}" font-size="20" fill="${TEXTO}">Atajo cuando ya tienes las dos mitades: <tspan font-weight="700">final = (conocimiento + habilidades) / 2</tspan>, donde habilidades = (TC1 + TC2) / 2.</text>
  <text x="60" y="${yTot + 132}" font-size="20" fill="#5a6b73">Programa de Tutoría CETEMIN · EVA-NOTA</text>
</svg>`
}

async function main() {
  const contenido = svg()
  writeFileSync('logs/formula-nota.svg', contenido)
  console.log(`SVG escrito en logs/formula-nota.svg (nota de Pedro: ${fmt(total)})`)
  if (process.argv.includes('--svg')) return
  const { uploadImage } = await import('../lib/cloudinary')
  const url = await uploadImage(Buffer.from(contenido, 'utf8'), 'sophia/tutoria')
  console.log('URL:', url)
}

main().catch((e) => { console.error(e); process.exit(1) })
