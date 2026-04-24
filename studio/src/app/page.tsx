"use client";

import { useRef, useState, useEffect } from "react";
import { Sidebar } from "@/components/studio/Sidebar";
import { Editor } from "@/components/studio/Editor";
import { FigmaPreview } from "@/components/studio/FigmaPreview";
import { LibraryModal } from "@/components/studio/LibraryModal";
import { useStudio } from "@/lib/store";
import { downloadPdf, triggerPrint } from "@/lib/pdf";

export default function Home() {
  const doc = useStudio((s) => s.doc);
  const saveAs = useStudio((s) => s.saveAs);
  const replaceDoc = useStudio((s) => s.replaceDoc);

  const [mounted, setMounted] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function onSaveAs() {
    const suggested = doc.savedName || `${doc.type}-${doc.meta.docNumber}`;
    const name = prompt("Save as…", suggested);
    if (name && name.trim()) saveAs(name.trim());
  }

  function onExportJson() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.meta.docNumber || "document"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportJson() {
    importInputRef.current?.click();
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !parsed.type || !parsed.meta) throw new Error("Invalid document JSON");
        replaceDoc(parsed);
      } catch (err) {
        alert("Could not import JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  async function onDownload() {
    if (!previewRef.current) return;
    try {
      await downloadPdf(previewRef.current, doc.meta.docNumber || "document");
    } catch (e) {
      alert("PDF export failed: " + (e as Error).message);
    }
  }

  return (
    <div className="pd-studio">
      {/* Top bar (not printed) */}
      <header className="pd-topbar pd-no-print">
        <div className="pd-topbar__brand">
          <span className="pd-topbar__title" style={{ fontFamily: "var(--font-farkey)" }}>
            Prime Digitals · Studio
          </span>
          <span className="pd-topbar__doc">
            {doc.meta.docNumber} · {doc.savedName ? `saved as “${doc.savedName}”` : "unsaved"}
          </span>
        </div>
        <div className="pd-topbar__actions">
          <button className="pd-btn pd-btn--ghost" onClick={triggerPrint}>Print</button>
          <button className="pd-btn pd-btn--primary" onClick={onDownload}>Download PDF</button>
        </div>
      </header>

      <div className="pd-studio__cols">
        <div className="pd-studio__sidebar pd-no-print">
          <Sidebar
            onOpenLibrary={() => setLibOpen(true)}
            onSaveAs={onSaveAs}
            onExportJson={onExportJson}
            onImportJson={onImportJson}
          />
        </div>

        <div className="pd-studio__editor pd-no-print">
          <Editor />
        </div>

        <div className="pd-studio__preview">
          <FigmaPreview doc={doc} ref={previewRef} />
        </div>
      </div>

      {libOpen && <LibraryModal onClose={() => setLibOpen(false)} />}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
