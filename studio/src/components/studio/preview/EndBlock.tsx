"use client";

import type { Doc } from "@/lib/schema";
import { HAS_ITEMS, IS_LETTER } from "@/lib/schema";
import { computeTotals, formatAmount } from "@/lib/money";
import { useStudio } from "@/lib/store";
import { Positionable } from "../Positionable";
import { InlineText } from "../InlineText";
import { rewrapP, stripP } from "./html";

/* eslint-disable @next/next/no-img-element -- signature data: URLs and brand PNGs
   must render byte-identically in print; next/image would rewrite them. */

export function EndBlock({ doc }: { doc: Doc }) {
  const setPayment = useStudio((s) => s.setPayment);
  const setSignature = useStudio((s) => s.setSignature);
  const updateClause = useStudio((s) => s.updateClause);

  const totals = computeTotals(doc.items, doc.money.taxRows);
  const fmt = (n: number) => formatAmount(n, doc.money.numbering, doc.money.currency);

  return (
    <div className="fg-endblock">
      {HAS_ITEMS[doc.type] && (
        <Positionable id="payrow" className="fg-payRow">
          <Positionable id="payment" className="fg-payment">
            <div className="fg-payment__title">Payment method</div>
            <div className="fg-payment__line">
              <strong>UPI ID:</strong>{" "}
              <InlineText
                id="pay-upi"
                value={doc.payment.upiId}
                onCommit={(v) => setPayment({ upiId: v })}
              />
            </div>
            <div className="fg-payment__line">
              <strong>Bank Details:</strong>{" "}
              <InlineText
                id="pay-bank"
                value={doc.payment.bankAccount}
                onCommit={(v) => setPayment({ bankAccount: v })}
              />
            </div>
            {doc.payment.bankIfsc && (
              <InlineText
                id="pay-ifsc"
                as="div"
                className="fg-payment__line fg-payment__ifsc"
                value={doc.payment.bankIfsc}
                onCommit={(v) => setPayment({ bankIfsc: v })}
              />
            )}
          </Positionable>
          <Positionable id="totals" className="fg-totals">
            <div className="fg-totals__row">
              <span>Total Project Cost:</span>
              <span className="fg-totals__num">{fmt(totals.grand)}</span>
            </div>
            {doc.payment.advancePaid > 0 && (
              <>
                <div className="fg-totals__row">
                  <span>Advance Paid:</span>
                  <span className="fg-totals__num">{fmt(doc.payment.advancePaid)}</span>
                </div>
                <div className="fg-totals__row">
                  <span>Amount Pending:</span>
                  <span className="fg-totals__num">
                    {fmt(totals.grand - doc.payment.advancePaid)}
                  </span>
                </div>
              </>
            )}
            <div className="fg-grand">
              <span>Grand Total</span>
              <span className="fg-grand__num">{fmt(totals.grand)}</span>
            </div>
          </Positionable>
        </Positionable>
      )}

      {/* Terms — letters render their clauses as body paragraphs instead */}
      {!IS_LETTER[doc.type] && doc.clauses.length > 0 && (
        <Positionable id="terms" className="fg-terms">
          <div className="fg-terms__title">Terms &amp; Conditions:</div>
          <ol className="fg-terms__list">
            {doc.clauses.map((c) => (
              <li key={c.id}>
                {c.title && (
                  <strong>
                    <InlineText
                      id={`clause-${c.id}-title`}
                      value={c.title}
                      onCommit={(v) => updateClause(c.id, { title: v })}
                    />
                    {": "}
                  </strong>
                )}
                <InlineText
                  id={`clause-${c.id}-body`}
                  html
                  value={stripP(c.bodyHtml)}
                  onCommit={(v) => updateClause(c.id, { bodyHtml: rewrapP(v) })}
                />
              </li>
            ))}
          </ol>
        </Positionable>
      )}

      {!IS_LETTER[doc.type] && (
        <Positionable id="thanks" className="fg-thanks">
          <InlineText
            id="thanks-note"
            value={doc.payment.thankYouNote}
            onCommit={(v) => setPayment({ thankYouNote: v })}
            placeholder="Thank-you note"
          />
        </Positionable>
      )}

      {/* Contact + stamp */}
      <Positionable id="stampRow" className="fg-stampRow">
        <Positionable
          id="contact"
          className="fg-contactCol"
          baseStyle={{ fontSize: doc.bands.contactFontSize }}
        >
          <div className="fg-contactLine">
            <span className="fg-contactIcon fg-contactIcon--phone">📞</span>
            <InlineText
              id="contact-phone"
              value={doc.payment.contactPhone}
              onCommit={(v) => setPayment({ contactPhone: v })}
              placeholder="Phone"
            />
          </div>
          <div className="fg-contactLine">
            <span className="fg-contactIcon fg-contactIcon--mail">✉</span>
            <InlineText
              id="contact-email"
              value={doc.payment.contactEmail}
              onCommit={(v) => setPayment({ contactEmail: v })}
              placeholder="Email"
            />
          </div>
        </Positionable>
        <Positionable id="stamp" className="fg-stampCol">
          <img
            src={doc.signature.dataUrl || "/brand/logomark.png"}
            alt={doc.signature.dataUrl ? "Signature" : ""}
            className="fg-stamp__img"
            style={{ width: doc.bands.stampSize, height: doc.bands.stampSize }}
            draggable={false}
          />
          <InlineText
            id="stamp-name"
            as="div"
            className="fg-stamp__name"
            value={doc.signature.name}
            onCommit={(v) => setSignature({ name: v })}
            placeholder="Signatory"
          />
        </Positionable>
      </Positionable>
    </div>
  );
}
