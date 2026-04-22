"use client";

import { useStudio } from "@/lib/store";
import { CURRENCIES, DOC_TYPE_LABELS } from "@/lib/schema";
import type { Currency, DocType, Numbering, WatermarkPos } from "@/lib/schema";
import { SignatureUpload } from "@/components/brand/SignatureUpload";

export function Sidebar({
  onOpenLibrary,
  onSaveAs,
  onExportJson,
  onImportJson,
}: {
  onOpenLibrary: () => void;
  onSaveAs: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
}) {
  const doc = useStudio((s) => s.doc);
  const setType = useStudio((s) => s.setType);
  const setCurrency = useStudio((s) => s.setCurrency);
  const setNumbering = useStudio((s) => s.setNumbering);
  const setWatermark = useStudio((s) => s.setWatermark);
  const setSignature = useStudio((s) => s.setSignature);
  const setPartyFrom = useStudio((s) => s.setPartyFrom);
  const newDoc = useStudio((s) => s.newDoc);

  return (
    <aside className="pd-sidebar">
      <div className="pd-sb-section">
        <div className="pd-sb-title">Document Type</div>
        <div className="pd-doctype-grid">
          {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`pd-doctype-btn${doc.type === t ? " is-active" : ""}`}
            >
              {DOC_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={() => newDoc(doc.type)} className="pd-sb-linkbtn">
          + New blank {DOC_TYPE_LABELS[doc.type].toLowerCase()}
        </button>
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Currency &amp; Numbering</div>
        <label className="pd-sb-label">Currency</label>
        <select
          value={doc.money.currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="pd-input"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <label className="pd-sb-label" style={{ marginTop: 10 }}>Numbering</label>
        <div className="pd-seg">
          {(["indian", "intl"] as Numbering[]).map((n) => (
            <button
              key={n}
              onClick={() => setNumbering(n)}
              className={`pd-seg-btn${doc.money.numbering === n ? " is-active" : ""}`}
            >
              {n === "indian" ? "Indian (1,23,45,678)" : "Intl (12,345,678)"}
            </button>
          ))}
        </div>
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Watermark</div>
        <div className="pd-seg">
          {(["bl", "br", "none"] as WatermarkPos[]).map((p) => (
            <button
              key={p}
              onClick={() => setWatermark(p)}
              className={`pd-seg-btn${doc.watermark === p ? " is-active" : ""}`}
            >
              {p === "bl" ? "Bottom left" : p === "br" ? "Bottom right" : "Off"}
            </button>
          ))}
        </div>
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Signature</div>
        <SignatureUpload
          value={doc.signature.dataUrl}
          onChange={(dataUrl) => setSignature({ dataUrl })}
        />
        <label className="pd-sb-label" style={{ marginTop: 10 }}>Signatory name</label>
        <input
          value={doc.signature.name}
          onChange={(e) => setSignature({ name: e.target.value })}
          className="pd-input"
        />
        <label className="pd-sb-label" style={{ marginTop: 8 }}>Role</label>
        <input
          value={doc.signature.role}
          onChange={(e) => setSignature({ role: e.target.value })}
          className="pd-input"
        />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Sender (From)</div>
        <label className="pd-sb-label">Company / Name</label>
        <input
          value={doc.parties.from.name}
          onChange={(e) => setPartyFrom({ name: e.target.value })}
          className="pd-input"
        />
        <label className="pd-sb-label" style={{ marginTop: 8 }}>Address + contact</label>
        <textarea
          value={doc.parties.from.lines}
          onChange={(e) => setPartyFrom({ lines: e.target.value })}
          rows={4}
          className="pd-input"
        />
      </div>

      <div className="pd-sb-section pd-sb-actions">
        <button onClick={onSaveAs} className="pd-btn pd-btn--primary">Save to library</button>
        <button onClick={onOpenLibrary} className="pd-btn pd-btn--ghost">Open library</button>
        <button onClick={onExportJson} className="pd-btn pd-btn--ghost">Export JSON</button>
        <button onClick={onImportJson} className="pd-btn pd-btn--ghost">Import JSON</button>
      </div>
    </aside>
  );
}
