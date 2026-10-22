import { useCallback, useRef } from 'react';

/**
 * Marks a DOM subtree as the sole visible content while printing (see the
 * `[data-print-target]` rule in index.css). Attach `ref` to the printable
 * container and call `print()` from a "Download PDF" / "Print" button —
 * this lets many independent cards on the same page (e.g. a grid of report
 * cards) each have their own working print button without printing the
 * whole page.
 */
export function usePrintTarget<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  const print = useCallback(() => {
    const node = ref.current;
    if (!node) {
      window.print();
      return;
    }
    node.setAttribute('data-print-target', 'true');
    const cleanup = () => node.removeAttribute('data-print-target');
    window.addEventListener('afterprint', cleanup, { once: true });
    // Fallback in case `afterprint` doesn't fire (varies by browser/print-preview flow).
    setTimeout(cleanup, 3000);
    window.print();
  }, []);

  return { ref, print };
}
