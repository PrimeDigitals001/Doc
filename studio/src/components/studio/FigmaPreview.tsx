"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Doc, Item } from "@/lib/schema";
import { HAS_ITEMS, IS_LETTER } from "@/lib/schema";
import { useStudio } from "@/lib/store";
import { LayoutCtx, MEASURE_CTX } from "./layout-context";
import type { StudioMode } from "./layout-context";
import { Positionable } from "./Positionable";
import { InlineText } from "./InlineText";
import { TopBand, BottomBand } from "./preview/Bands";
import { EndBlock } from "./preview/EndBlock";
import { ItemsTable, ItemRowMeasure, ItemsHeadMeasure } from "./preview/ItemsTable";
import { rewrapP } from "./preview/html";

// Avoid the useLayoutEffect SSR warning
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// A4 at 96dpi: 794 × 1123 px
const PAGE_PX = 1123;
const SIDE_GUTTER_PX = 48;
const BODY_PAD_TOP = 20; // .fg-body padding-top
const SAFETY_PX = 12;
const LAST_PAGE_RESERVE = 280; // payment + terms + stamp reserve on the last page
const BLOCK_GAP_PX = 16;

type Block =
  | { kind: "node"; key: string; node: React.ReactNode }
  | { kind: "item"; key: string; item: Item };

type Props = {
  doc: Doc;
  mode?: StudioMode;
  selectedId?: string | null;
  editingId?: string | null;
  onSelect?: (id: string | null) => void;
  onBeginEdit?: (id: string | null) => void;
};

export const FigmaPreview = forwardRef<HTMLDivElement, Props>(function FigmaPreview(
  { doc, mode = "move", selectedId = null, editingId = null, onSelect, onBeginEdit },
  ref
) {
  const setMeta = useStudio((s) => s.setMeta);
  const setPartyTo = useStudio((s) => s.setPartyTo);
  const setLetter = useStudio((s) => s.setLetter);
  const updateClause = useStudio((s) => s.updateClause);

  const select = useCallback((id: string | null) => onSelect?.(id), [onSelect]);
  const beginEdit = useCallback((id: string | null) => onBeginEdit?.(id), [onBeginEdit]);

  /**
   * Real usable height, derived from the live band values.
   *
   * `.fg-topband` is `position: relative` — it sits in flow and consumes
   * `topHeight` — while `.fg-bottomband` is absolute, so its top edge is
   * `PAGE_PX - bottomHeight + bottomOffsetY`. The old hardcoded 110/90 reserve
   * overfilled every page by ~120px.
   */
  const contentPx = useMemo(() => {
    const top = doc.bands.topHeight + BODY_PAD_TOP;
    const bottom = PAGE_PX - doc.bands.bottomHeight + doc.bands.bottomOffsetY;
    return Math.max(200, bottom - top - SAFETY_PX);
  }, [doc.bands.topHeight, doc.bands.bottomHeight, doc.bands.bottomOffsetY]);

  // Ordered blocks living ABOVE the end block (payment/terms/stamp).
  const blocks: Block[] = useMemo(() => {
    const list: Block[] = [];

    // ----- LETTER LAYOUT -----
    if (IS_LETTER[doc.type] && doc.letter) {
      const l = doc.letter;
      list.push({
        kind: "node",
        key: "letter-date",
        node: (
          <Positionable id="letter-date" className="fg-letterDate">
            {formatDate(doc.meta.date)}
          </Positionable>
        ),
      });
      list.push({
        kind: "node",
        key: "letter-title",
        node: (
          <Positionable id="letter-title" as="h1" className="fg-letterTitle">
            <InlineText
              id="letter-title-text"
              value={l.title}
              onCommit={(v) => setLetter({ title: v })}
            />
          </Positionable>
        ),
      });
      list.push({
        kind: "node",
        key: "letter-salutation",
        node: (
          <Positionable id="letter-salutation" className="fg-letterSalutation">
            <InlineText
              id="letter-salutation-text"
              value={l.salutation}
              onCommit={(v) => setLetter({ salutation: v })}
            />
          </Positionable>
        ),
      });
      doc.clauses.forEach((c) => {
        list.push({
          kind: "node",
          key: `letter-body-${c.id}`,
          node: (
            <Positionable id={`letter-body-${c.id}`} className="fg-letterBody">
              {c.title && (
                <InlineText
                  id={`letter-body-${c.id}-heading`}
                  as="h3"
                  className="fg-letterBody__heading"
                  value={c.title}
                  onCommit={(v) => updateClause(c.id, { title: v })}
                />
              )}
              <InlineText
                id={`letter-body-${c.id}-prose`}
                as="div"
                className="fg-letterBody__prose"
                html
                value={c.bodyHtml}
                onCommit={(v) => updateClause(c.id, { bodyHtml: rewrapP(v) })}
              />
            </Positionable>
          ),
        });
      });
      list.push({
        kind: "node",
        key: "letter-closing",
        node: (
          <Positionable id="letter-closing" className="fg-letterClosing">
            {l.closing && (
              <InlineText
                id="letter-closing-1"
                as="div"
                value={l.closing}
                onCommit={(v) => setLetter({ closing: v })}
              />
            )}
            {l.closing2 && (
              <InlineText
                id="letter-closing-2"
                as="div"
                value={l.closing2}
                onCommit={(v) => setLetter({ closing2: v })}
              />
            )}
          </Positionable>
        ),
      });
      list.push({
        kind: "node",
        key: "letter-signoff",
        node: (
          <Positionable id="letter-signoff" className="fg-letterSignoff">
            <InlineText
              id="letter-signoff-text"
              value={l.signoff}
              onCommit={(v) => setLetter({ signoff: v })}
            />
          </Positionable>
        ),
      });
      return list;
    }

    // ----- INVOICE / QUOTATION / AGREEMENT / TNC -----
    list.push({
      kind: "node",
      key: "header-row",
      node: (
        <Positionable id="header-row" className="fg-topRow">
          <div className="fg-invoiceTo">
            <div className="fg-invoiceTo__label">
              {doc.type === "invoice"
                ? "Invoice To:"
                : doc.type === "quotation"
                  ? "Quotation To:"
                  : "Party:"}
            </div>
            <InlineText
              id="to-name"
              as="div"
              className="fg-invoiceTo__name"
              value={doc.parties.to.name}
              onCommit={(v) => setPartyTo({ name: v })}
              placeholder="Client name"
            />
            {doc.meta.attn && (
              <InlineText
                id="to-attn"
                as="div"
                className="fg-invoiceTo__attn"
                value={doc.meta.attn}
                onCommit={(v) => setMeta({ attn: v })}
              />
            )}
            <InlineText
              id="to-lines"
              as="div"
              className="fg-invoiceTo__contact"
              style={{ whiteSpace: "pre-line" }}
              multiline
              value={doc.parties.to.lines}
              onCommit={(v) => setPartyTo({ lines: v })}
            />
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
              :{" "}
              <InlineText
                id="doc-number"
                value={doc.meta.docNumber}
                onCommit={(v) => setMeta({ docNumber: v })}
              />
            </div>
            <div className="fg-idDate">
              <span className="fg-idDate__label">
                {doc.type === "invoice"
                  ? "Invoice Date"
                  : doc.type === "quotation"
                    ? "Quotation Date"
                    : "Date"}
              </span>
              <span className="fg-idDate__value">{formatDate(doc.meta.date)}</span>
            </div>
          </div>
        </Positionable>
      ),
    });

    // One block per line item so the table can flow across pages; the renderer
    // regroups consecutive item blocks into a single table per page.
    if (HAS_ITEMS[doc.type]) {
      doc.items.forEach((it) => {
        list.push({ kind: "item", key: `item-${it.id}`, item: it });
      });
    }

    return list;
  }, [doc, setMeta, setPartyTo, setLetter, updateClause]);

  // Measure & paginate. We store *keys*, not nodes, so re-renders with identical
  // pagination don't trigger infinite setState loops.
  const measureRef = useRef<HTMLDivElement>(null);
  const headMeasureRef = useRef<HTMLDivElement>(null);
  const [pageKeys, setPageKeys] = useState<string[][]>(() => [blocks.map((b) => b.key)]);

  useIsoLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const heights: number[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const el = root.children[i] as HTMLElement | undefined;
      heights.push(el?.offsetHeight ?? 0);
    }
    // The items <thead> is re-emitted on every page that carries items, so its
    // height has to be reserved once per such page.
    const headH = headMeasureRef.current?.offsetHeight ?? 0;

    const newPages: string[][] = [];
    let current: string[] = [];
    let used = 0;
    let pageHasItems = false;
    for (let i = 0; i < blocks.length; i++) {
      const h = heights[i];
      const isItem = blocks[i].kind === "item";
      const isLast = i === blocks.length - 1;
      const reserve = isLast ? LAST_PAGE_RESERVE : 0;
      const headCost = isItem && !pageHasItems ? headH : 0;
      if (current.length > 0 && used + headCost + h + reserve > contentPx) {
        newPages.push(current);
        current = [];
        used = isItem ? headH : 0;
        pageHasItems = isItem;
      } else {
        used += headCost;
        if (isItem) pageHasItems = true;
      }
      current.push(blocks[i].key);
      used += h + BLOCK_GAP_PX;
    }
    newPages.push(current);
    if (used + LAST_PAGE_RESERVE > contentPx && current.length > 0) {
      newPages.push([]);
    }
    const same =
      newPages.length === pageKeys.length &&
      newPages.every(
        (p, i) => p.length === pageKeys[i].length && p.every((k, j) => k === pageKeys[i][j])
      );
    if (!same) setPageKeys(newPages);
  }, [blocks, pageKeys, contentPx]);

  const blocksByKey = useMemo(() => {
    const map = new Map<string, Block>();
    blocks.forEach((b) => map.set(b.key, b));
    return map;
  }, [blocks]);

  const pages: Block[][] = pageKeys.map(
    (keys) => keys.map((k) => blocksByKey.get(k)).filter(Boolean) as Block[]
  );

  const interactive = mode !== "preview";

  return (
    <div
      ref={ref}
      className="fg-pages"
      onPointerDown={(e) => {
        // Click on empty space around/inside a page → deselect
        if (e.target === e.currentTarget) select(null);
      }}
    >
      {/* Hidden measurement pass — rendered inert via MEASURE_CTX */}
      <LayoutCtx.Provider value={MEASURE_CTX}>
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
            <div key={b.key}>
              {b.kind === "item" ? <ItemRowMeasure item={b.item} doc={doc} /> : b.node}
            </div>
          ))}
        </div>
        <div
          ref={headMeasureRef}
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
          <ItemsHeadMeasure />
        </div>
      </LayoutCtx.Provider>

      {pages.map((pageBlocks, pi) => {
        const isLast = pi === pages.length - 1;
        return (
          <LayoutCtx.Provider
            key={pi}
            value={{
              measuring: false,
              interactive,
              mode,
              selectedId,
              editingId,
              pageIndex: pi,
              select,
              beginEdit,
            }}
          >
            <section className="fg-page">
              <TopBand doc={doc} />

              <div
                className="fg-body"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) select(null);
                }}
              >
                {renderPageBlocks(pageBlocks, doc)}
                {isLast && <EndBlock doc={doc} />}
              </div>

              {pages.length > 1 && (
                <Positionable id="pagenum" className="fg-pagenum">
                  Page {pi + 1} / {pages.length}
                </Positionable>
              )}

              <BottomBand doc={doc} />
            </section>
          </LayoutCtx.Provider>
        );
      })}
    </div>
  );
});

/** Consecutive item blocks are grouped into one table, header re-emitted per page. */
function renderPageBlocks(pageBlocks: Block[], doc: Doc): React.ReactNode {
  const out: React.ReactNode[] = [];
  let buffer: Item[] = [];
  let bufferKey = "";

  const flush = () => {
    if (buffer.length === 0) return;
    out.push(
      <Positionable key={`items-${bufferKey}`} id="items-table">
        <ItemsTable items={buffer} doc={doc} />
      </Positionable>
    );
    buffer = [];
    bufferKey = "";
  };

  pageBlocks.forEach((b) => {
    if (b.kind === "item") {
      if (buffer.length === 0) bufferKey = b.key;
      buffer.push(b.item);
    } else {
      flush();
      out.push(
        <div key={b.key} className="fg-block">
          {b.node}
        </div>
      );
    }
  });
  flush();

  return out;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
