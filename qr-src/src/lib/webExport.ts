// Web only: turns the rendered QR (SVG) + caption into a PNG, then downloads or shares it.

async function toDataUrl(href: string): Promise<string> {
  if (href.startsWith('data:')) return href;
  const blob = await (await fetch(href)).blob();
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export async function qrPng(container: HTMLElement, o: { fg: string; bg: string; caption?: string }): Promise<Blob> {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('QR not rendered');
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Images inside an SVG drawn to canvas must be inline data URLs.
  for (const img of Array.from(clone.querySelectorAll('image'))) {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (href) img.setAttribute('href', await toDataUrl(href));
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const pic = new Image();
  pic.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await pic.decode();

  const Q = 1024, PAD = 64, CAP = o.caption ? 120 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = Q + PAD * 2;
  canvas.height = Q + PAD * 2 + CAP;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pic, PAD, PAD, Q, Q);
  if (o.caption) {
    try { await (document as any).fonts?.ready; } catch {}
    ctx.fillStyle = o.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 60;
    const font = (s: number) => `700 ${s}px "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.font = font(size);
    while (ctx.measureText(o.caption).width > Q && size > 28) ctx.font = font((size -= 4));
    ctx.fillText(o.caption, canvas.width / 2, Q + PAD + CAP / 2, Q);
  }
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'));
}

export function fileName(caption?: string) {
  const base = (caption || 'qr-code').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40);
  return (base || 'qr-code') + '.png';
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Returns true if the system share sheet opened, false if it fell back to a download. */
export async function shareOrDownload(blob: Blob, name: string): Promise<boolean> {
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return true;
    }
  }
  download(blob, name);
  return false;
}
