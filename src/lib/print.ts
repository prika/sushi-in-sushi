/**
 * openPrintWindow - Opens a popup with ticket HTML and triggers browser print dialog
 */
export function openPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;

  win.document.write(
    `<html><head><title>Imprimir</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  win.onafterprint = () => win.close();
}
