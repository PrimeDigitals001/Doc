# Prime Digitals — Document Studio

Single-page app for producing quotations, invoices, agreements, T&Cs and letters as
print-perfect A4 documents. Deployed at https://doc-rho.vercel.app/

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (TypeScript is strict; build fails on type errors)
npm run lint
```

There is no backend, no API and no database. Everything lives in the browser.

## Layout

```
┌─ topbar ── Move · Edit · Preview │ → Convert to Invoice │ Print │ Download PDF ─┐
├─ Sidebar (260px) ─┬─ Editor (380px) ─┬─ FigmaPreview (rest) ───────────────────┤
│ doc type, currency│ details, recipient│ live A4 pages — drag and click-to-edit  │
│ band sliders,     │ contact, payment, │                                        │
│ signature, sender │ items, clauses    │                                        │
└───────────────────┴───────────────────┴────────────────────────────────────────┘
```

| Path | Role |
|---|---|
| `src/lib/schema.ts` | All types + `makeDefaultDoc()`. The `Doc` object is the whole document. |
| `src/lib/store.ts` | zustand store, persisted to `localStorage` under `pd-studio-v1`. |
| `src/lib/layout.ts` | Element ids, capabilities, and the bands↔layout adapter. |
| `src/lib/money.ts` | Indian/international number formatting and totals. |
| `src/components/studio/FigmaPreview.tsx` | Measures, paginates and renders the pages. |
| `src/components/studio/Positionable.tsx` | Drag/select wrapper. |
| `src/components/studio/InlineText.tsx` | Click-to-edit text on the page. |
| `src/app/globals.css` | All styling. `pd-` = studio chrome, `fg-` = the document itself. |

## Module guide

### Free-form layout — added 2026-09-10
**What it does:** Any element on the page can be selected and dragged where you want it,
instead of being nudged through sliders in the sidebar.

**How to use:** In **Move** mode, click an element to select it, then drag. Shift locks to one
axis; Alt disables the 4px snap; arrow keys nudge 1px (Shift+arrow 10px). The badge above a
selected element offers **↺** (reset this element) and, where it applies, **⇱ Free**.

**Flow vs Free.** By default a dragged element stays in the document flow and is only
visually offset, so pagination is unaffected — this is the safe default and covers almost
every case. **⇱ Free** detaches it: it becomes absolutely positioned and can go anywhere,
including over other content, and the space it occupied closes up. **⇲ Dock** puts it back.

**Where positions are stored:** the six band elements (top/bottom band, logo, title, contact,
stamp) still write to `doc.bands`, so the sidebar sliders and dragging edit the same numbers
and stay in sync. Everything else writes to `doc.layout`. `src/lib/layout.ts` is the only
place that knows the difference — go through `readOverride`/`writeOverride`.

**Getting unstuck:** an element can never be dragged more than 24px off the page. Per-element
↺ resets one; **↺ Reset all positions** in the sidebar resets everything and shows how many
elements have been moved.

**The one rule when editing this code:** never write to the store during `pointermove`.
`FigmaPreview` re-measures and re-paginates on every render, so a store write per mouse-move
would re-measure the whole document every frame. Drag writes to the DOM directly and commits
once, on pointer-up.

### Inline editing — added 2026-09-10
**What it does:** double-click text on the page and type. Covers the contact phone and email,
UPI/bank/IFSC, thank-you note, recipient name/attn/address, document number, item
title/subtitle/qty/rate, clause titles and bodies, signatory name, and every letter field.

**Edit vs drag:** single click selects, drag moves, double-click edits. Escape reverts,
Enter or clicking away commits.

**Why the code looks the way it does:** the editable node never receives React children and
is synced from `value` in a layout effect that skips while it has focus — if React owned the
content, every store update would steal the caret. `onInput` deliberately does *not* touch
the store; committing happens on blur. Double-click is detected from pointer-down timing
because `preventDefault()` on `pointerdown` suppresses the browser's `dblclick` entirely.

`meta.subject` and `meta.validity` are not rendered on the page, so they stay in the form pane.

### Quotation → Invoice — added 2026-09-10
**What it does:** one click turns the open quotation into an invoice without retyping.

**How to use:** **→ Convert to Invoice** in the top bar (only shown on quotations), or
**→ Invoice** on any saved quotation row in the library.

**What happens:** the quotation is saved to the library first, then an invoice is created
carrying over everything — items, taxes, clauses, parties, payment details, signature and the
whole layout — with a fresh `INV-` number, today's date, no validity, and a `convertedFrom`
link back. The invoice is saved too and becomes the open document. Nothing is ever lost, and
converting the same quotation twice updates its library entry rather than duplicating it.

**Note:** document numbers are random 4-digit (`INV-2026-4731`), not sequential. If you need
gap-free numbering for filing, edit the number by hand or see "Ideas" below.

### Documents & library
Saved documents live in `localStorage` (`pd-studio-v1`), which means **one browser only** —
clearing site data loses them. Use **Export JSON** for anything you need to keep. Import
backfills fields that old files predate, so exports from older versions still load.

The store is versioned (currently `7`); changing the shape of `Doc` means bumping
`version` in `store.ts` and extending `migrate()`'s `patch()`, which runs over the open
document *and* every library entry.

## Testing manually

1. Hard-reload with existing data → contact email reads `business@primedigitals.co.in`; an
   email you customised yourself is left alone.
2. Switch to **Letter** → Contact phone/email fields are present (they print on every type).
3. Add ~25 items → content never runs into the bottom ribbon, and Ctrl+P has no blank page.
4. Drag the logo, title, contact block and stamp → the matching sidebar slider tracks it.
5. Double-click the email on the page, retype it, click away → preview and form pane agree.
6. Ctrl+P **with an element selected and a field mid-edit** → the print preview must be
   completely clean: no outlines, badges or placeholder text.
7. Convert a quotation → both documents in the library, layout carried over.

## Troubleshooting

**A change to a default in `schema.ts` doesn't show up.** Defaults only apply to new
documents. Existing ones are already in `localStorage`. Change it in `migrate()` too and bump
`version`, or clear site data.

**Something I dragged vanished.** It's clipped by `.fg-page`'s `overflow: hidden`. Select it
and press ↺, or use **↺ Reset all positions**.

**Ribbons or table headers print white.** The browser's print dialog has "Background
graphics" switched off. The CSS forces `print-color-adjust: exact`, but that setting still
wins in some browsers.

**Item rows render blank.** Something is wrapping the item blocks and breaking the data path
in `renderPageBlocks`. Rows must be built from `Item` data (`block.item`), never by reading
`.props` off a React element — that used to be the bug here.

**Content overlaps the bottom ribbon.** Pagination budget is computed from `doc.bands` in
`FigmaPreview`, and it also reserves one items-table `<thead>` per page that carries items.
If you add anything else that repeats per page, reserve its height too.

## Ideas not built yet

Company profile/settings (one home for brand + payment details), duplicate document, client
directory, saved item catalogue, reusable clause presets, cloud sync (the big one — data is
currently one-browser-only), sequential invoice numbering, document status tracking
(sent/accepted/paid), a real PDF renderer instead of `window.print()`, amount-in-words
(`amountInWords()` already exists in `money.ts`, unused), discounts and per-item tax, and a
UPI payment QR on invoices.
