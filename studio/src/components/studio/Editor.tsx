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
  const setPayment = useStudio((s) => s.setPayment);

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
          <Field label="Attn: (optional)" full>
            <input
              className="pd-input"
              value={doc.meta.attn || ""}
              onChange={(e) => setMeta({ attn: e.target.value })}
              placeholder="Attn: Mr. Meet Patel"
            />
          </Field>
          <Field label="Phone + email (multi-line)" full>
            <textarea
              className="pd-input"
              rows={3}
              value={doc.parties.to.lines}
              onChange={(e) => setPartyTo({ lines: e.target.value })}
              placeholder={"P : +91 00000 00000\nE : client@example.com"}
            />
          </Field>
        </div>
      </section>

      {HAS_ITEMS[doc.type] && (
        <section className="pd-ed-section">
          <h3 className="pd-ed-title">Payment &amp; totals</h3>
          <div className="pd-ed-grid2">
            <Field label="UPI ID">
              <input
                className="pd-input"
                value={doc.payment.upiId}
                onChange={(e) => setPayment({ upiId: e.target.value })}
              />
            </Field>
            <Field label="Bank account">
              <input
                className="pd-input"
                value={doc.payment.bankAccount}
                onChange={(e) => setPayment({ bankAccount: e.target.value })}
              />
            </Field>
            <Field label="IFSC / Bank code">
              <input
                className="pd-input"
                value={doc.payment.bankIfsc}
                onChange={(e) => setPayment({ bankIfsc: e.target.value })}
              />
            </Field>
            <Field label="Advance paid">
              <input
                className="pd-input"
                type="number"
                min={0}
                step="any"
                value={doc.payment.advancePaid}
                onChange={(e) => setPayment({ advancePaid: Number(e.target.value) })}
              />
            </Field>
            <Field label="Thank-you note" full>
              <input
                className="pd-input"
                value={doc.payment.thankYouNote}
                onChange={(e) => setPayment({ thankYouNote: e.target.value })}
              />
            </Field>
            <Field label="Contact phone">
              <input
                className="pd-input"
                value={doc.payment.contactPhone}
                onChange={(e) => setPayment({ contactPhone: e.target.value })}
              />
            </Field>
            <Field label="Contact email">
              <input
                className="pd-input"
                value={doc.payment.contactEmail}
                onChange={(e) => setPayment({ contactEmail: e.target.value })}
              />
            </Field>
          </div>
        </section>
      )}

      {HAS_ITEMS[doc.type] && (
        <section className="pd-ed-section">
          <div className="pd-ed-hdr">
            <h3 className="pd-ed-title">Line items</h3>
            <button className="pd-btn pd-btn--ghost" onClick={addItem}>+ Add row</button>
          </div>
          <div className="pd-items-edit">
            {doc.items.map((it, i) => (
              <div key={it.id} className="pd-item-card">
                <div className="pd-item-card__row1">
                  <span className="pd-item-hash">#{i + 1}</span>
                  <input
                    className="pd-input pd-item-title"
                    placeholder="Item title (e.g. Web Development)"
                    value={it.title}
                    onChange={(e) => updateItem(it.id, { title: e.target.value })}
                  />
                  <button className="pd-icon-btn" title="Remove" onClick={() => removeItem(it.id)}>✕</button>
                </div>
                <textarea
                  className="pd-input pd-item-sub"
                  placeholder="Subtitle / description (optional, multi-line allowed)"
                  rows={3}
                  value={it.sub}
                  onChange={(e) => updateItem(it.id, { sub: e.target.value })}
                />
                <div className="pd-item-card__row2">
                  <label className="pd-item-mini">
                    <span>Qty</span>
                    <input
                      className="pd-input pd-item-num"
                      type="number"
                      min={0}
                      step="any"
                      value={it.qty}
                      onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })}
                    />
                  </label>
                  <label className="pd-item-mini">
                    <span>Rate</span>
                    <input
                      className="pd-input pd-item-num"
                      type="number"
                      min={0}
                      step="any"
                      value={it.rate}
                      onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })}
                    />
                  </label>
                </div>
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
