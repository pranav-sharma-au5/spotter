export function openEldPrintWindow(elementId: string, title: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head><title>${title}</title></head>
      <body style="margin:0;padding:0">${el.innerHTML}</body>
    </html>
  `);
  win.document.close();
  win.print();
}
