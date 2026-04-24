"use client";

/**
 * Download PDF = native browser print (same engine that renders the preview),
 * so fidelity matches pixel-for-pixel. Users pick "Save as PDF" in the print dialog.
 *
 * The filename hint is written into <title> before the print dialog opens;
 * most browsers use <title> as the default save name.
 */
export function downloadPdf(_element: HTMLElement, filename: string) {
  const prev = document.title;
  document.title = filename;
  window.print();
  // Restore title on focus (the dialog blocks until resolved)
  const restore = () => {
    document.title = prev;
    window.removeEventListener("focus", restore);
  };
  window.addEventListener("focus", restore);
}

export function triggerPrint() {
  window.print();
}
