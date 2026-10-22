export async function exportSvgToPng(svgSelector: string, filename = 'chart.png') {
  const svgNode = document.querySelector(svgSelector) as SVGElement | null;
  if (!svgNode) return void alert('Chart SVG not found for export.');
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgNode);
  const svg64 = btoa(unescape(encodeURIComponent(svgString)));
  const imgSrc = 'data:image/svg+xml;base64,' + svg64;
  const img = new Image();
  img.src = imgSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to render SVG')); 
  });
  const canvas = document.createElement('canvas');
  canvas.width = (img.width || 800) * 2;
  canvas.height = (img.height || 400) * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return void alert('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) return alert('Export failed');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function downloadSvg(svgSelector: string, filename = 'chart.svg') {
  const svgNode = document.querySelector(svgSelector) as SVGElement | null;
  if (!svgNode) return void alert('Chart SVG not found for download.');
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgNode);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printChart(svgContainerSelector: string) {
  const node = document.querySelector(svgContainerSelector) as HTMLElement | null;
  if (!node) return void alert('Chart not found for print');
  const svg = node.querySelector('svg');
  const serializer = new XMLSerializer();
  const html = svg ? serializer.serializeToString(svg as any) : node.innerHTML;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return void alert('Unable to open print window');
  w.document.write('<html><head><title>Print chart</title></head><body>' + html + '</body></html>');
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}
