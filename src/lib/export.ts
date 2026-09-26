function serialize(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = Array.from(document.styleSheets).flatMap((sheet) => { try { return Array.from(sheet.cssRules).map((rule) => rule.cssText) } catch { return [] } }).join('\n')
  clone.prepend(style)
  return new XMLSerializer().serializeToString(clone)
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportSvg(svg: SVGSVGElement, name: string) { download(new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`) }

async function rasterize(svg: SVGSVGElement, scale = 3): Promise<HTMLCanvasElement> {
  const vb = svg.viewBox.baseVal
  const canvas = document.createElement('canvas'); canvas.width = vb.width * scale; canvas.height = vb.height * scale
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fdfdfb'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const image = new Image(); const url = URL.createObjectURL(new Blob([serialize(svg)], { type: 'image/svg+xml' }))
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = url })
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); return canvas
}

export async function exportPng(svg: SVGSVGElement, name: string) { const canvas = await rasterize(svg); canvas.toBlob((blob) => blob && download(blob, `${name}.png`), 'image/png') }
export function exportCanvasPng(canvas: HTMLCanvasElement, name: string) { canvas.toBlob((blob) => blob && download(blob, `${name}.png`), 'image/png') }
export async function exportPdf(svg: SVGSVGElement, name: string) {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), rasterize(svg, 2.5)])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 277, 195)
  pdf.save(`${name}.pdf`)
}
