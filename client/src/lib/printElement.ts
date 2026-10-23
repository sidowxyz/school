/**
 * Print one element on its own, independent of the page around it.
 *
 * Printing straight from the page (the `[data-print-target]` approach) breaks
 * for content inside dialogs and side sheets: their fixed, transformed,
 * scrolling containers clip or offset what reaches the paper. Instead, copy
 * the element into a hidden iframe that loads the app's own stylesheets and
 * print that. The iframe's <html> never gets the `dark` class, so prints are
 * always in the light theme.
 */
export function printElement(node: HTMLElement, title = document.title): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    window.print();
    return;
  }

  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('\n');
  const safeTitle = title.replace(/[<>&]/g, '');
  doc.open();
  doc.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<base href="${window.location.origin}/">
${styles}
<style>
  @page { margin: 12mm; }
  html, body { background: #fff; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body><div data-print-target="true">${node.outerHTML}</div></body>
</html>`);
  doc.close();

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };

  // Wait for stylesheets and images (e.g. the school logo) before printing.
  const pending: Promise<unknown>[] = [
    ...[...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => new Promise((resolve) => {
      l.addEventListener('load', resolve, { once: true });
      l.addEventListener('error', resolve, { once: true });
    })),
    ...[...doc.images].filter((img) => !img.complete).map((img) => new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    })),
  ];
  const ready = Promise.race([Promise.all(pending), new Promise((resolve) => setTimeout(resolve, 1500))]);

  ready.then(() => {
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Some browsers never fire afterprint for iframes; don't leave it behind.
    setTimeout(cleanup, 60_000);
  });
}
