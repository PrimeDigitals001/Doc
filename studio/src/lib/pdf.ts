"use client";

export async function downloadPdf(element: HTMLElement, filename: string) {
  // html2pdf.js is CJS + browser-only; dynamic import keeps it out of SSR
  // @ts-expect-error no types shipped
  const html2pdf = (await import("html2pdf.js")).default;
  const opt = {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  await html2pdf().set(opt).from(element).save();
}

export function triggerPrint() {
  window.print();
}
