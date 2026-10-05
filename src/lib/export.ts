// Brand fonts are inlined as data URIs: an SVG rasterised through <img> cannot fetch external files.
const FONT_FACES = [
  { family: 'Jost', file: '/fonts/jost-latin-variable.woff2', weight: '100 900', style: 'normal' },
  { family: 'Cormorant Garamond', file: '/fonts/cormorant-garamond-latin-variable.woff2', weight: '300 700', style: 'normal' },
  { family: 'Cormorant Garamond', file: '/fonts/cormorant-garamond-latin-variable-italic.woff2', weight: '300 700', style: 'italic' },
]
let fontCss: Promise<string> | undefined

async function dataUri(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob) })
}

function embeddedFonts(): Promise<string> {
  fontCss ??= Promise.all(FONT_FACES.map(async (face) => `@font-face { font-family: '${face.family}'; src: url('${await dataUri(face.file)}') format('woff2'); font-weight: ${face.weight}; font-style: ${face.style}; }`))
    .then((rules) => rules.join('\n'))
    .catch(() => { fontCss = undefined; return '' })
  return fontCss
}

async function serialize(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  const rules = Array.from(document.styleSheets).flatMap((sheet) => { try { return Array.from(sheet.cssRules).filter((rule) => !(rule instanceof CSSFontFaceRule)).map((rule) => rule.cssText) } catch { return [] } })
  style.textContent = `${await embeddedFonts()}\n${rules.join('\n')}`
  clone.prepend(style)
  return new XMLSerializer().serializeToString(clone)
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportSvg(svg: SVGSVGElement, name: string) { download(new Blob([await serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`) }

async function rasterize(svg: SVGSVGElement, scale = 3): Promise<HTMLCanvasElement> {
  await document.fonts.ready
  const vb = svg.viewBox.baseVal
  const canvas = document.createElement('canvas'); canvas.width = vb.width * scale; canvas.height = vb.height * scale
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fdfdfb'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const image = new Image(); const url = URL.createObjectURL(new Blob([await serialize(svg)], { type: 'image/svg+xml' }))
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url })
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); return canvas
}

export async function exportPng(svg: SVGSVGElement, name: string) { const canvas = await rasterize(svg); canvas.toBlob((blob) => blob && download(blob, `${name}.png`), 'image/png') }
export function exportCanvasPng(canvas: HTMLCanvasElement, name: string) { canvas.toBlob((blob) => blob && download(blob, `${name}.png`), 'image/png') }

/** Full-bleed portrait A4 page, so it can be inserted directly into a quotation PDF. */
export async function exportPdf(svg: SVGSVGElement, name: string) {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), rasterize(svg, 2.5)])
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(canvas.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 210, 297)
  pdf.save(`${name}.pdf`)
}
