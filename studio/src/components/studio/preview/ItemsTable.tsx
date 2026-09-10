"use client";

import type { Doc, Item } from "@/lib/schema";
import { formatAmount } from "@/lib/money";
import { useStudio } from "@/lib/store";
import { InlineText } from "../InlineText";

function fmt(n: number, doc: Doc): string {
  return formatAmount(n, doc.money.numbering, doc.money.currency);
}

const COLUMNS = ["Item description", "Quantity", "Unit Price", "Total Price"] as const;

function ItemsHead() {
  return (
    <thead>
      <tr>
        {COLUMNS.map((c, i) => (
          <th key={c} className={i === 0 ? undefined : "center"}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * Header-only table, measured off-screen. The header is re-emitted on every page
 * that carries items, so pagination has to reserve its height — otherwise each
 * page overfills by exactly one header.
 */
export function ItemsHeadMeasure() {
  return (
    <table className="fg-items">
      <ItemsHead />
    </table>
  );
}

/** One row, rendered inside a full table so measurement gets its true height. */
export function ItemRowMeasure({ item, doc }: { item: Item; doc: Doc }) {
  return (
    <table className="fg-items fg-items--measure">
      <tbody>
        <tr>
          <td>
            <div className="fg-items__title">{item.title}</div>
            {item.sub && <div className="fg-items__sub">{item.sub}</div>}
          </td>
          <td className="center fg-items__qty">{String(item.qty).padStart(2, "0")}</td>
          <td className="center fg-items__num">{fmt(item.rate, doc)}</td>
          <td className="center fg-items__num">{fmt(item.qty * item.rate, doc)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * The items for one page, as a single table with the header re-emitted.
 * Rows come from `Item` data directly — the previous version read `.props` off a
 * React element, which broke silently the moment a row got wrapped.
 */
export function ItemsTable({ items, doc }: { items: Item[]; doc: Doc }) {
  const updateItem = useStudio((s) => s.updateItem);

  return (
    <table className="fg-items">
      <ItemsHead />
      <tbody>
        {items.map((it) => (
          <tr key={it.id}>
            <td>
              <InlineText
                id={`item-${it.id}-title`}
                as="div"
                className="fg-items__title"
                value={it.title}
                onCommit={(v) => updateItem(it.id, { title: v })}
                placeholder="Item title"
              />
              {it.sub && (
                <InlineText
                  id={`item-${it.id}-sub`}
                  as="div"
                  className="fg-items__sub"
                  multiline
                  value={it.sub}
                  onCommit={(v) => updateItem(it.id, { sub: v })}
                />
              )}
            </td>
            <td className="center fg-items__qty">
              <InlineText
                id={`item-${it.id}-qty`}
                numeric
                value={String(it.qty).padStart(2, "0")}
                /* the displayed value is padded/formatted, so compare numbers —
                   otherwise every blur would write an identical value back */
                onCommit={(v) => {
                  const n = Number(v);
                  if (n !== it.qty) updateItem(it.id, { qty: n });
                }}
              />
            </td>
            <td className="center fg-items__num">
              <InlineText
                id={`item-${it.id}-rate`}
                numeric
                value={fmt(it.rate, doc)}
                onCommit={(v) => {
                  const n = Number(v);
                  if (n !== it.rate) updateItem(it.id, { rate: n });
                }}
              />
            </td>
            <td className="center fg-items__num">{fmt(it.qty * it.rate, doc)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
