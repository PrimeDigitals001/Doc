"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Doc } from "@/lib/schema";
import { DOC_TYPE_EYEBROW, HAS_ITEMS } from "@/lib/schema";
import { Logo } from "@/components/brand/Logo";
import { Watermark } from "@/components/brand/Watermark";
import { amountInWords, computeTotals, formatAmount } from "@/lib/money";

type Props = { doc: Doc };

// A4 = 210 × 297mm. We compute usable content height by subtracting header (~180px) and footer
// reserve (~260px for endblock + BR corner) from the 297mm total at 96dpi.
//   297mm ≈ 1123px @96dpi.
const PAGE_PX = 1123;
const HEADER_PX = 180;
const FOOTER_PX = 30;       // small bottom margin (BR corner is decorative, content can sit over its empty area)
const ENDBLOCK_RESERVE = 260; // signature + contact reserve on LAST page
const CONTENT_PX = PAGE_PX - HEADER_PX - FOOTER_PX;

type Block =
  | { kind: "title-parties"; node: React.ReactNode }
  | { kind: "items"; node: React.ReactNode }
  | { kind: "amount-words"; node: React.ReactNode }
  | { kind: "clause"; node: React.ReactNode } // keep for typescript compat if needed
  | { kind: "clause-title"; node: React.ReactNode }
  | { kind: "clause-part"; node: React.ReactNode };

export const PaginatedPreview = forwardRef<HTMLDivElement, Props>(
  function PaginatedPreview({ doc }, ref) {
    const fmt = useCallback((n: number) => formatAmount(n, doc.money.numbering, doc.money.currency), [doc.money.numbering, doc.money.currency]);
    const totals = useMemo(
      () => computeTotals(doc.items, doc.money.taxRows),
      [doc.items, doc.money.taxRows]
    );

    // Build the ordered list of blocks once per render
    const blocks: Block[] = useMemo(() => {
      const list: Block[] = [];
      list.push({
        kind: "title-parties",
        node: (
          <>
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
          </>
        ),
      });

      if (HAS_ITEMS[doc.type] && doc.items.length > 0) {
        list.push({
          kind: "items",
          node: (
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
                    <td className="num">{fmt(totals.subtotal)}</td>
                  </tr>
                  {totals.taxes.map((t, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="num">{t.label}</td>
                      <td className="num">{fmt(t.amount)}</td>
                    </tr>
                  ))}
                  <tr className="grand">
                    <td colSpan={4} className="num">Total</td>
                    <td className="num">{fmt(totals.grand)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          ),
        });
        list.push({
          kind: "amount-words",
          node: (
            <div className="pd-amount-words">
              <span>Amount in words:</span>{" "}
              {amountInWords(totals.grand, doc.money.numbering, doc.money.currency)}
            </div>
          ),
        });
      }

      let hasAddedFirstClause = false;
      doc.clauses.forEach((c) => {
        const isFirstClause = !hasAddedFirstClause;
        hasAddedFirstClause = true;

        list.push({
          kind: "clause-title",
          node: (
            <div className={`pd-clause-block`}>
              <div className="pd-section-title">
                <span>{c.title}</span>
                <span className="pd-rule" aria-hidden />
              </div>
            </div>
          ),
        });

        if (typeof window !== "undefined") {
          const parser = new DOMParser();
          const docFragment = parser.parseFromString(c.bodyHtml, "text/html");
          Array.from(docFragment.body.childNodes).forEach((child) => {
             const html = child.nodeType === 1 ? (child as Element).outerHTML : child.textContent;
             if (!html || !html.trim()) return;
             list.push({
               kind: "clause-part",
               node: (
                 <div className="pd-clause-block pd-clause-prose-part">
                   <div className="pd-prose" dangerouslySetInnerHTML={{ __html: html }} />
                 </div>
               ),
             });
          });
        } else {
            // Server side fallback
             list.push({
               kind: "clause-part",
               node: (
                 <div className="pd-clause-block pd-clause-prose-part">
                   <div className="pd-prose" dangerouslySetInnerHTML={{ __html: c.bodyHtml }} />
                 </div>
               ),
             });
        }
      });

      return list;
    }, [doc, totals, fmt]);

    // Measurement: render each block invisibly at A4 width, read its height.
    const measureRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<Block[][]>([[...blocks]]);

    useLayoutEffect(() => {
      const root = measureRef.current;
      if (!root) return;
      const heights: number[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const el = root.children[i] as HTMLElement | undefined;
        heights.push(el?.offsetHeight ?? 0);
      }
      // Pack into pages with greedy fill
      const newPages: Block[][] = [];
      let current: Block[] = [];
      let used = 0;
      let hasSeenFirstClause = false;
      const endBlockHeight = ENDBLOCK_RESERVE;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const h = heights[i];
        
        let shouldForceBreak = false;
        if (b.kind === "clause-title" && !hasSeenFirstClause) {
          hasSeenFirstClause = true;
          if (current.length > 0 && HAS_ITEMS[doc.type]) {
            shouldForceBreak = true;
          }
        }

        const isLast = i === blocks.length - 1;
        const reserve = isLast ? endBlockHeight : 0;
        
        if (current.length > 0 && (used + h + reserve > CONTENT_PX || shouldForceBreak)) {
          newPages.push(current);
          current = [];
          used = 0;
        }
        current.push(b);
        used += h + 12; // 12px gap heuristic
      }
      // Make sure the LAST page can fit the endblock; if not, push endblock to a fresh page.
      // We do this by moving last block(s) until endblock fits.
      // Simpler: just keep pushing pages — endblock always rendered on the last visual page.
      if (current.length === 0 && newPages.length === 0) current = [];
      newPages.push(current);
      // Validate that last page has room for endblock; if not, add an empty trailing page.
      if (used + endBlockHeight > CONTENT_PX && current.length > 0) {
        newPages.push([]); // trailing empty page just for the endblock + footer
      }
      setPages(newPages);
    }, [blocks]);

    return (
      <div ref={ref} className="pd-pages">
        {/* Hidden measurement layer */}
        <div
          ref={measureRef}
          aria-hidden
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            width: "calc(210mm - 104px)", // matches body horizontal padding
            left: -99999,
            top: 0,
          }}
        >
          {blocks.map((b, i) => (
            <div key={i}>{b.node}</div>
          ))}
        </div>

        {/* Real paginated render */}
        {pages.map((pageBlocks, pi) => {
          const isLast = pi === pages.length - 1;
          return (
            <section key={pi} className="pd-page pd-page--paginated">
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

              <div className="pd-body pd-body--paginated">
                {pageBlocks.map((b, i) => (
                  <div key={i}>{b.node}</div>
                ))}

                {isLast && (
                  <div className="pd-endblock">
                    <div className="pd-signature2">
                      {doc.signature.dataUrl ? (
                        <img
                          src={doc.signature.dataUrl}
                          alt="Signature"
                          className="pd-signature2__img"
                        />
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
                        .map((line, idx) => (
                          <span key={idx}>{line}</span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Page number */}
              <div className="pd-pagenum">
                Page {pi + 1} / {pages.length}
              </div>

              <img src="/brand/corner.svg" alt="" aria-hidden className="pd-corner pd-corner--br" />

              {doc.watermark !== "none" && <Watermark position={doc.watermark} />}
            </section>
          );
        })}
      </div>
    );
  }
);

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
