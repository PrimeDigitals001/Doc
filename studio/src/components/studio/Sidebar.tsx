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
  const setBands = useStudio((s) => s.setBands);
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
        <div className="pd-sb-title">Top band</div>
        <SliderRow label="Height" value={doc.bands.topHeight} min={60} max={240} onChange={(v) => setBands({ topHeight: v })} unit="px" />
        <SliderRow label="Shift ← →" value={doc.bands.topOffsetX} min={-120} max={120} onChange={(v) => setBands({ topOffsetX: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.topOffsetY} min={-80} max={80} onChange={(v) => setBands({ topOffsetY: v })} unit="px" />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Logo</div>
        <SliderRow label="From left" value={doc.bands.topLogoLeft} min={-40} max={300} onChange={(v) => setBands({ topLogoLeft: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.topLogoTop} min={-80} max={80} onChange={(v) => setBands({ topLogoTop: v })} unit="px" />
        <SliderRow label="Size" value={doc.bands.topLogoSize} min={30} max={160} onChange={(v) => setBands({ topLogoSize: v })} unit="px" />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Title (INVOICE / etc.)</div>
        <SliderRow label="From right" value={doc.bands.topTitleRight} min={-40} max={300} onChange={(v) => setBands({ topTitleRight: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.topTitleTop} min={-80} max={80} onChange={(v) => setBands({ topTitleTop: v })} unit="px" />
        <SliderRow label="Font size" value={doc.bands.topTitleSize} min={14} max={72} onChange={(v) => setBands({ topTitleSize: v })} unit="px" />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Bottom band</div>
        <SliderRow label="Height" value={doc.bands.bottomHeight} min={40} max={220} onChange={(v) => setBands({ bottomHeight: v })} unit="px" />
        <SliderRow label="Shift ← →" value={doc.bands.bottomOffsetX} min={-120} max={120} onChange={(v) => setBands({ bottomOffsetX: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.bottomOffsetY} min={-80} max={80} onChange={(v) => setBands({ bottomOffsetY: v })} unit="px" />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Logomark (stamp)</div>
        <SliderRow label="Size" value={doc.bands.stampSize} min={48} max={220} onChange={(v) => setBands({ stampSize: v })} unit="px" />
        <SliderRow label="Shift ← →" value={doc.bands.stampOffsetX} min={-200} max={200} onChange={(v) => setBands({ stampOffsetX: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.stampOffsetY} min={-200} max={200} onChange={(v) => setBands({ stampOffsetY: v })} unit="px" />
      </div>

      <div className="pd-sb-section">
        <div className="pd-sb-title">Contact (phone + email)</div>
        <SliderRow label="Font size" value={doc.bands.contactFontSize} min={8} max={20} onChange={(v) => setBands({ contactFontSize: v })} unit="px" />
        <SliderRow label="Shift ← →" value={doc.bands.contactOffsetX} min={-200} max={200} onChange={(v) => setBands({ contactOffsetX: v })} unit="px" />
        <SliderRow label="Shift ↑ ↓" value={doc.bands.contactOffsetY} min={-200} max={200} onChange={(v) => setBands({ contactOffsetY: v })} unit="px" />
        <button
          onClick={() =>
            setBands({
              topHeight: 174,
              topOffsetX: 0,
              topOffsetY: 8,
              topLogoLeft: 45,
              topLogoTop: 12,
              topLogoSize: 45,
              topTitleRight: 83,
              topTitleTop: 14,
              topTitleSize: 35,
              bottomHeight: 220,
              bottomOffsetX: 0,
              bottomOffsetY: 55,
              stampSize: 137,
              stampOffsetX: -10,
              stampOffsetY: 7,
              contactFontSize: 12,
              contactOffsetX: 0,
              contactOffsetY: 0,
            })
          }
          className="pd-sb-linkbtn"
        >
          ↺ Reset all band controls
        </button>
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

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="pd-slider-row">
      <div className="pd-slider-label">
        <span>{label}</span>
        <span className="pd-slider-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pd-slider"
      />
    </div>
  );
}
