"use client";

import { forwardRef } from "react";
import type { Doc } from "@/lib/schema";
import { DOC_TYPE_EYEBROW, HAS_ITEMS } from "@/lib/schema";
import { Logo } from "@/components/brand/Logo";
import { Watermark } from "@/components/brand/Watermark";
import { amountInWords, computeTotals, formatAmount } from "@/lib/money";

type Props = { doc: Doc };

export const Preview = forwardRef<HTMLElement, Props>(function Preview({ doc }, ref) {
  const { subtotal, taxes, grand } = computeTotals(doc.items, doc.money.taxRows);
  const fmt = (n: number) => formatAmount(n, doc.money.numbering, doc.money.currency);

  return (
    <section className="pd-page" ref={ref as React.Ref<HTMLElement>}>
      {/* Top-left decorative corner */}
      <img src="/brand/corner.svg" alt="" aria-hidden className="pd-corner pd-corner--tl" />

      <div className="pd-header2">
        <div className="pd-header2__logo">
          <Logo variant="plain" height={110} />
        </div>
        <div className="pd-header2__meta">
          <div className="pd-header2__eyebrow">{DOC_TYPE_EYEBROW[doc.type]}</div>
          <div className="pd-header2__docno">{doc.meta.docNumber}</div>
          <div className="pd-header2__date">{formatDate(doc.meta.date)}</div>
        </div>
      </div>

      <div className="pd-body">
        <div className="pd-title-block">
          <div className="pd-title">{doc.parties.to.name}</div>
          <div className="pd-subtitle">{doc.meta.subject}</div>
        </div>

        <div className="pd-parties">
          <div>
            <div className="pd-parties__label">From</div>
            <div className="pd-parties__name">{doc.parties.from.name}</div>
            <div className="pd-parties__text" style={{ whiteSpace: "pre-line" }}>
              {doc.parties.from.lines}
            </div>
          </div>
          <div>
            <div className="pd-parties__label">To</div>
            <div className="pd-parties__name">{doc.parties.to.name}</div>
            <div className="pd-parties__text" style={{ whiteSpace: "pre-line" }}>
              {doc.parties.to.lines}
            </div>
          </div>
        </div>

        {HAS_ITEMS[doc.type] && doc.items.length > 0 && (
          <>
            <div className="pd-section-title">
              <span>Items</span>
              <span className="pd-rule" aria-hidden />
            </div>
            <table className="pd-items">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((it, i) => (
                  <tr key={it.id}>
                    <td>{i + 1}</td>
                    <td>{it.desc || <em style={{ color: "#b6bcc3" }}>Item description…</em>}</td>
                    <td className="num">{it.qty}</td>
                    <td className="num">{fmt(it.rate)}</td>
                    <td className="num">{fmt(it.qty * it.rate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="num">Subtotal</td>
                  <td className="num">{fmt(subtotal)}</td>
                </tr>
                {taxes.map((t, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="num">{t.label}</td>
                    <td className="num">{fmt(t.amount)}</td>
                  </tr>
                ))}
                <tr className="grand">
                  <td colSpan={4} className="num">Total</td>
                  <td className="num">{fmt(grand)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="pd-amount-words">
              <span>Amount in words:</span>{" "}
              {amountInWords(grand, doc.money.numbering, doc.money.currency)}
            </div>
          </>
        )}

        {doc.clauses.map((c) => (
          <div key={c.id} className="pd-clause-block">
            <div className="pd-section-title">
              <span>{c.title}</span>
              <span className="pd-rule" aria-hidden />
            </div>
            <div className="pd-prose" dangerouslySetInnerHTML={{ __html: c.bodyHtml }} />
          </div>
        ))}

        <div className="pd-endblock">
          <div className="pd-signature2">
            {doc.signature.dataUrl ? (
              <img src={doc.signature.dataUrl} alt="Signature" className="pd-signature2__img" />
            ) : (
              <div className="pd-signature2__placeholder">upload your signature</div>
            )}
            <div className="pd-signature2__line" />
            <div className="pd-signature2__name">{doc.signature.name}</div>
            <div className="pd-signature2__role">{doc.signature.role}</div>
          </div>

          <div className="pd-contact">
            {doc.parties.from.lines
              .split("\n")
              .filter(Boolean)
              .slice(-3)
              .map((line, i) => (
                <span key={i}>{line}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Bottom-right decorative corner */}
      <img src="/brand/corner.svg" alt="" aria-hidden className="pd-corner pd-corner--br" />

      {doc.watermark !== "none" && <Watermark position={doc.watermark} />}
    </section>
  );
});

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
