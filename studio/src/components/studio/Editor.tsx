"use client";

import { useStudio } from "@/lib/store";
import { HAS_ITEMS } from "@/lib/schema";
import { RichText } from "./RichText";

export function Editor() {
  const doc = useStudio((s) => s.doc);
  const setMeta = useStudio((s) => s.setMeta);
  const setPartyTo = useStudio((s) => s.setPartyTo);
  const addItem = useStudio((s) => s.addItem);
  const updateItem = useStudio((s) => s.updateItem);
  const removeItem = useStudio((s) => s.removeItem);
  const addClause = useStudio((s) => s.addClause);
  const updateClause = useStudio((s) => s.updateClause);
  const removeClause = useStudio((s) => s.removeClause);
  const moveClause = useStudio((s) => s.moveClause);
  const addTaxRow = useStudio((s) => s.addTaxRow);
  const updateTaxRow = useStudio((s) => s.updateTaxRow);
  const removeTaxRow = useStudio((s) => s.removeTaxRow);

  return (
    <div className="pd-editor">
      <section className="pd-ed-section">
        <h3 className="pd-ed-title">Document details</h3>
        <div className="pd-ed-grid2">
          <Field label="Document no.">
            <input
              className="pd-input"
              value={doc.meta.docNumber}
              onChange={(e) => setMeta({ docNumber: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className="pd-input"
              value={doc.meta.date}
              onChange={(e) => setMeta({ date: e.target.value })}
            />
          </Field>
          <Field label="Subject / subtitle" full>
            <input
              className="pd-input"
              value={doc.meta.subject}
              onChange={(e) => setMeta({ subject: e.target.value })}
            />
          </Field>
          {doc.type === "quotation" && (
            <Field label="Valid until (optional)" full>
              <input
                className="pd-input"
                value={doc.meta.validity || ""}
                onChange={(e) => setMeta({ validity: e.target.value })}
              />
            </Field>
          )}
        </div>
      </section>

      <section className="pd-ed-section">
        <h3 className="pd-ed-title">Recipient (To)</h3>
        <div className="pd-ed-grid2">
          <Field label="Name / Company" full>
            <input
              className="pd-input"
              value={doc.parties.to.name}
              onChange={(e) => setPartyTo({ name: e.target.value })}
            />
          </Field>
          <Field label="Address + contact" full>
            <textarea
              className="pd-input"
              rows={4}
              value={doc.parties.to.lines}
              onChange={(e) => setPartyTo({ lines: e.target.value })}
            />
          </Field>
        </div>
      </section>

      {HAS_ITEMS[doc.type] && (
        <section className="pd-ed-section">
          <div className="pd-ed-hdr">
            <h3 className="pd-ed-title">Line items</h3>
            <button className="pd-btn pd-btn--ghost" onClick={addItem}>+ Add row</button>
          </div>
          <div className="pd-items-edit">
            {doc.items.map((it, i) => (
              <div key={it.id} className="pd-item-row">
                <div className="pd-item-hash">{i + 1}</div>
                <input
                  className="pd-input pd-item-desc"
                  placeholder="Description"
                  value={it.desc}
                  onChange={(e) => updateItem(it.id, { desc: e.target.value })}
                />
                <input
                  className="pd-input pd-item-num"
                  type="number"
                  min={0}
                  step="any"
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })}
                />
                <input
                  className="pd-input pd-item-num"
                  type="number"
                  min={0}
                  step="any"
                  value={it.rate}
                  onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })}
                />
                <button className="pd-icon-btn" title="Remove" onClick={() => removeItem(it.id)}>✕</button>
              </div>
            ))}
            {doc.items.length === 0 && (
              <div className="pd-empty">No items yet — click “Add row”.</div>
            )}
          </div>

          <div className="pd-ed-hdr" style={{ marginTop: 16 }}>
            <h4 className="pd-ed-subtitle">Taxes</h4>
            <button className="pd-btn pd-btn--ghost" onClick={addTaxRow}>+ Add tax</button>
          </div>
          <div className="pd-tax-rows">
            {doc.money.taxRows.map((t) => (
              <div key={t.id} className="pd-tax-row">
                <input
                  className="pd-input"
                  value={t.label}
                  onChange={(e) => updateTaxRow(t.id, { label: e.target.value })}
                />
                <input
                  className="pd-input pd-item-num"
                  type="number"
                  min={0}
                  step="any"
                  value={t.percent}
                  onChange={(e) => updateTaxRow(t.id, { percent: Number(e.target.value) })}
                />
                <span className="pd-tax-pct">%</span>
                <button className="pd-icon-btn" onClick={() => removeTaxRow(t.id)}>✕</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pd-ed-section">
        <div className="pd-ed-hdr">
          <h3 className="pd-ed-title">Clauses &amp; sections</h3>
          <button className="pd-btn pd-btn--ghost" onClick={addClause}>+ Add clause</button>
        </div>
        <div className="pd-clauses">
          {doc.clauses.map((c, i) => (
            <div key={c.id} className="pd-clause">
              <div className="pd-clause-hdr">
                <input
                  className="pd-input pd-clause-title"
                  value={c.title}
                  onChange={(e) => updateClause(c.id, { title: e.target.value })}
                />
                <div className="pd-clause-actions">
                  <button
                    className="pd-icon-btn"
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => moveClause(c.id, -1)}
                  >▲</button>
                  <button
                    className="pd-icon-btn"
                    title="Move down"
                    disabled={i === doc.clauses.length - 1}
                    onClick={() => moveClause(c.id, 1)}
                  >▼</button>
                  <button className="pd-icon-btn" title="Delete" onClick={() => removeClause(c.id)}>✕</button>
                </div>
              </div>
              <RichText
                value={c.bodyHtml}
                onChange={(html) => updateClause(c.id, { bodyHtml: html })}
                placeholder="Write the clause text… use the toolbar for formatting."
                minHeight={90}
              />
            </div>
          ))}
          {doc.clauses.length === 0 && (
            <div className="pd-empty">No clauses yet. Add your first one above.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`pd-field${full ? " pd-field--full" : ""}`}>
      <span className="pd-field-label">{label}</span>
      {children}
    </label>
  );
}
