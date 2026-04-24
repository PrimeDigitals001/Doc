"use client";

import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// Avoid useLayoutEffect SSR warning
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import type { Doc } from "@/lib/schema";
import { DOC_TYPE_EYEBROW, HAS_ITEMS } from "@/lib/schema";
import { computeTotals, formatAmount } from "@/lib/money";

type Props = { doc: Doc };

// A4 at 96dpi: 794 × 1123 px
const PAGE_PX = 1123;
const TOP_BAND_PX = 110;      // height reserved for top-design band
const BOTTOM_BAND_PX = 90;    // height reserved for bottom-design band
const SIDE_GUTTER_PX = 48;    // left/right body padding
const LAST_PAGE_RESERVE = 280; // payment+terms+stamp reserve on last page
const CONTENT_PX = PAGE_PX - TOP_BAND_PX - BOTTOM_BAND_PX - 40;

type Block = {
  key: string;
  node: React.ReactNode;
};

export const FigmaPreview = forwardRef<HTMLDivElement, Props>(
  function FigmaPreview({ doc }, ref) {
    const totals = useMemo(
      () => computeTotals(doc.items, doc.money.taxRows),
      [doc.items, doc.money.taxRows]
    );
    const fmt = (n: number) => formatAmount(n, doc.money.numbering, doc.money.currency);

    // Ordered blocks that live ABOVE the "end block" (payment/terms/stamp)
    const blocks: Block[] = useMemo(() => {
      const list: Block[] = [];

      // 1. Invoice To + ID row
      list.push({
        key: "header-row",
        node: (
          <div className="fg-topRow">
            <div className="fg-invoiceTo">
              <div className="fg-invoiceTo__label">
                {doc.type === "invoice"
                  ? "Invoice To:"
                  : doc.type === "quotation"
                  ? "Quotation To:"
                  : "Party:"}
              </div>
              <div className="fg-invoiceTo__name">{doc.parties.to.name}</div>
              {doc.meta.attn && <div className="fg-invoiceTo__attn">{doc.meta.attn}</div>}
              <div className="fg-invoiceTo__contact" style={{ whiteSpace: "pre-line" }}>
                {doc.parties.to.lines}
              </div>
            </div>
            <div className="fg-idBox">
              <div className="fg-idPill">
                {doc.type === "invoice"
                  ? "INVOICE ID"
                  : doc.type === "quotation"
                  ? "QUOTATION ID"
                  : doc.type === "agreement"
                  ? "AGREEMENT ID"
                  : "DOCUMENT ID"}
                : {doc.meta.docNumber}
              </div>
              <div className="fg-idDate">
                <span className="fg-idDate__label">
                  {doc.type === "invoice" ? "Invoice Date" : doc.type === "quotation" ? "Quotation Date" : "Date"}
                </span>
                <span className="fg-idDate__value">{formatDate(doc.meta.date)}</span>
              </div>
            </div>
          </div>
        ),
      });

      // 2. Items table
      if (HAS_ITEMS[doc.type] && doc.items.length > 0) {
        list.push({
          key: "items",
          node: (
            <table className="fg-items">
              <thead>
                <tr>
                  <th>Item description</th>
                  <th className="center">Quantity</th>
                  <th className="center">Unite Price</th>
                  <th className="center">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="fg-items__title">{it.title || ""}</div>
                      {it.sub && <div className="fg-items__sub">{it.sub}</div>}
                    </td>
                    <td className="center fg-items__qty">
                      {String(it.qty).padStart(2, "0")}
                    </td>
                    <td className="center fg-items__num">{fmtNum(it.rate, doc)}</td>
                    <td className="center fg-items__num">{fmtNum(it.qty * it.rate, doc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        });
      }

      return list;
    }, [doc, fmt]);

    // Measure & paginate. We store *keys* (strings) for the pages — not node refs — so
    // re-renders with identical pagination don't trigger infinite setState loops.
    const measureRef = useRef<HTMLDivElement>(null);
    const [pageKeys, setPageKeys] = useState<string[][]>(() => [blocks.map((b) => b.key)]);

    useIsoLayoutEffect(() => {
      const root = measureRef.current;
      if (!root) return;
      const heights: number[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const el = root.children[i] as HTMLElement | undefined;
        heights.push(el?.offsetHeight ?? 0);
      }
      const newPages: string[][] = [];
      let current: string[] = [];
      let used = 0;
      for (let i = 0; i < blocks.length; i++) {
        const h = heights[i];
        const isLast = i === blocks.length - 1;
        const reserve = isLast ? LAST_PAGE_RESERVE : 0;
        if (current.length > 0 && used + h + reserve > CONTENT_PX) {
          newPages.push(current);
          current = [];
          used = 0;
        }
        current.push(blocks[i].key);
        used += h + 16;
      }
      newPages.push(current);
      if (used + LAST_PAGE_RESERVE > CONTENT_PX && current.length > 0) {
        newPages.push([]);
      }
      // Only update if changed (shallow compare)
      const same =
        newPages.length === pageKeys.length &&
        newPages.every(
          (p, i) =>
            p.length === pageKeys[i].length && p.every((k, j) => k === pageKeys[i][j])
        );
      if (!same) setPageKeys(newPages);
    }, [blocks, pageKeys]);

    const blocksByKey = useMemo(() => {
      const map = new Map<string, Block>();
      blocks.forEach((b) => map.set(b.key, b));
      return map;
    }, [blocks]);
    const pages: Block[][] = pageKeys.map((keys) =>
      keys.map((k) => blocksByKey.get(k)).filter(Boolean) as Block[]
    );

    return (
      <div ref={ref} className="fg-pages">
        {/* Hidden measurement */}
        <div
          ref={measureRef}
          aria-hidden
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            width: `calc(210mm - ${SIDE_GUTTER_PX * 2}px)`,
            left: -99999,
            top: 0,
          }}
        >
          {blocks.map((b) => (
            <div key={b.key}>{b.node}</div>
          ))}
        </div>

        {pages.map((pageBlocks, pi) => {
          const isLast = pi === pages.length - 1;
          return (
            <section key={pi} className="fg-page">
              {/* Top decorative band */}
              <div
                className="fg-topband"
                style={{
                  height: doc.bands.topHeight,
                  transform: `translate(${doc.bands.topOffsetX}px, ${doc.bands.topOffsetY}px)`,
                }}
              >
                <img src="/brand/header-ribbon.svg" alt="" aria-hidden className="fg-topband__bg" />
                <img
                  src="/brand/logo.png"
                  alt="Prime Digitals"
                  className="fg-topband__logo"
                  style={{
                    left: doc.bands.topLogoLeft,
                    height: doc.bands.topLogoSize,
                    transform: `translateY(calc(-50% + ${doc.bands.topLogoTop}px))`,
                  }}
                />
                <div
                  className="fg-topband__title"
                  style={{
                    right: doc.bands.topTitleRight,
                    fontSize: doc.bands.topTitleSize,
                    transform: `translateY(calc(-50% + ${doc.bands.topTitleTop}px))`,
                  }}
                >
                  {DOC_TYPE_EYEBROW[doc.type]}
                </div>
              </div>

              {/* Body */}
              <div className="fg-body">
                {pageBlocks.map((b) => (
                  <div key={b.key} className="fg-block">
                    {b.node}
                  </div>
                ))}

                {isLast && (
                  <div className="fg-endblock">
                    {/* Payment + totals row */}
                    {HAS_ITEMS[doc.type] && (
                      <div className="fg-payRow">
                        <div className="fg-payment">
                          <div className="fg-payment__title">Payment method</div>
                          <div className="fg-payment__line">
                            <strong>UPI ID:</strong> {doc.payment.upiId}
                          </div>
                          <div className="fg-payment__line">
                            <strong>Bank Details:</strong> {doc.payment.bankAccount}
                          </div>
                          {doc.payment.bankIfsc && (
                            <div className="fg-payment__line fg-payment__ifsc">{doc.payment.bankIfsc}</div>
                          )}
                        </div>
                        <div className="fg-totals">
                          <div className="fg-totals__row">
                            <span>Total Project Cost:</span>
                            <span className="fg-totals__num">{fmtNum(totals.grand, doc)}</span>
                          </div>
                          {doc.payment.advancePaid > 0 && (
                            <>
                              <div className="fg-totals__row">
                                <span>Advance Paid:</span>
                                <span className="fg-totals__num">{fmtNum(doc.payment.advancePaid, doc)}</span>
                              </div>
                              <div className="fg-totals__row">
                                <span>Amount Pending:</span>
                                <span className="fg-totals__num">{fmtNum(totals.grand - doc.payment.advancePaid, doc)}</span>
                              </div>
                            </>
                          )}
                          <div className="fg-grand">
                            <span>Grand Total</span>
                            <span className="fg-grand__num">{fmtNum(totals.grand, doc)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Terms */}
                    {doc.clauses.length > 0 && (
                      <div className="fg-terms">
                        <div className="fg-terms__title">Terms &amp; Conditions:</div>
                        <ol className="fg-terms__list">
                          {doc.clauses.map((c) => (
                            <li key={c.id}>
                              {c.title && <strong>{c.title}: </strong>}
                              <span dangerouslySetInnerHTML={{ __html: stripP(c.bodyHtml) }} />
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="fg-thanks">{doc.payment.thankYouNote}</div>

                    {/* Stamp + contact */}
                    <div className="fg-stampRow">
                      <div className="fg-contactCol">
                        <div className="fg-contactLine">
                          <span className="fg-contactIcon fg-contactIcon--phone">📞</span>
                          <span>{doc.payment.contactPhone}</span>
                        </div>
                        <div className="fg-contactLine">
                          <span className="fg-contactIcon fg-contactIcon--mail">✉</span>
                          <span>{doc.payment.contactEmail}</span>
                        </div>
                      </div>
                      <div
                        className="fg-stampCol"
                        style={{
                          transform: `translate(${doc.bands.stampOffsetX}px, ${doc.bands.stampOffsetY}px)`,
                        }}
                      >
                        {doc.signature.dataUrl ? (
                          <img
                            src={doc.signature.dataUrl}
                            alt="Signature"
                            className="fg-stamp__img"
                            style={{ width: doc.bands.stampSize, height: doc.bands.stampSize }}
                          />
                        ) : (
                          <img
                            src="/brand/logomark.png"
                            alt=""
                            className="fg-stamp__img"
                            style={{ width: doc.bands.stampSize, height: doc.bands.stampSize }}
                          />
                        )}
                        <div className="fg-stamp__name">{doc.signature.name}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Page number */}
              {pages.length > 1 && (
                <div className="fg-pagenum">
                  Page {pi + 1} / {pages.length}
                </div>
              )}

              {/* Bottom decorative band */}
              <div
                className="fg-bottomband"
                style={{
                  height: doc.bands.bottomHeight,
                  transform: `translate(${doc.bands.bottomOffsetX}px, ${doc.bands.bottomOffsetY}px)`,
                }}
              >
                <img src="/brand/footer-ribbon.svg" alt="" aria-hidden className="fg-bottomband__bg" />
              </div>
            </section>
          );
        })}
      </div>
    );
  }
);

function fmtNum(n: number, doc: Doc): string {
  return formatAmount(n, doc.money.numbering, doc.money.currency);
}

function stripP(html: string): string {
  // Strip outer <p> so it sits inside a <li> cleanly
  return html
    .replace(/^\s*<p[^>]*>/i, "")
    .replace(/<\/p>\s*$/i, "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "<br/>");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
