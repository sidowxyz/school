/**
 * Utility helper to cleanly print a target DOM element or the entire active printable area.
 */
export function triggerPrint(elementId?: string) {
  if (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.setAttribute('data-print-target', 'true');
      window.print();
      el.removeAttribute('data-print-target');
      return;
    }
  }
  window.print();
}
