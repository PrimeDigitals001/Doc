"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Clause,
  Currency,
  Doc,
  DocType,
  Item,
  LayoutMode,
  LayoutOverride,
  Numbering,
  Party,
  TaxRow,
  WatermarkPos,
} from "./schema";
import {
  LETTER_TEMPLATES,
  defaultTaxRows,
  makeDefaultDoc,
  makeDocNumber,
  makeId,
} from "./schema";
import type { LetterTemplate } from "./schema";
import { capabilityFor, readOverride, writeOverride } from "./layout";

type LibraryEntry = { id: string; name: string; doc: Doc };

type StoreState = {
  doc: Doc;
  library: LibraryEntry[];

  // doc-level
  setType: (t: DocType) => void;
  setMeta: (patch: Partial<Doc["meta"]>) => void;
  setPartyFrom: (patch: Partial<Party>) => void;
  setPartyTo: (patch: Partial<Party>) => void;

  // money
  setCurrency: (c: Currency) => void;
  setNumbering: (n: Numbering) => void;
  addTaxRow: () => void;
  updateTaxRow: (id: string, patch: Partial<TaxRow>) => void;
  removeTaxRow: (id: string) => void;

  // items
  addItem: () => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;

  // clauses
  addClause: () => void;
  updateClause: (id: string, patch: Partial<Clause>) => void;
  removeClause: (id: string) => void;
  moveClause: (id: string, dir: -1 | 1) => void;

  // signature + watermark
  setSignature: (patch: Partial<Doc["signature"]>) => void;
  setWatermark: (pos: WatermarkPos) => void;

  // payment
  setPayment: (patch: Partial<Doc["payment"]>) => void;

  // bands
  setBands: (patch: Partial<Doc["bands"]>) => void;

  // layout / free positioning
  setLayout: (id: string, patch: Partial<LayoutOverride>) => void;
  nudgeLayout: (id: string, ddx: number, ddy: number) => void;
  setLayoutMode: (
    id: string,
    mode: LayoutMode,
    seed?: { dx: number; dy: number; page: number; w?: number }
  ) => void;
  resetLayout: (id: string) => void;
  resetAllLayout: () => void;

  // letter
  setLetter: (patch: Partial<NonNullable<Doc["letter"]>>) => void;
  applyLetterTemplate: (tpl: import("./schema").LetterTemplate) => void;

  // library
  saveAs: (name: string) => void;
  loadFromLibrary: (id: string) => void;
  renameInLibrary: (id: string, name: string) => void;
  deleteFromLibrary: (id: string) => void;
  newDoc: (t: DocType) => void;

  // conversion
  convertToInvoice: (fromLibraryId?: string) => {
    quotationNumber: string;
    invoiceNumber: string;
  } | null;

  // IO
  replaceDoc: (d: Doc) => void;
};

/** Upsert a doc into a library array, matching on case-insensitive name. */
function upsert(
  library: LibraryEntry[],
  name: string,
  doc: Doc
): { library: LibraryEntry[]; entry: LibraryEntry } {
  const existing = library.find((e) => e.name.toLowerCase() === name.toLowerCase());
  const entry: LibraryEntry = {
    id: existing?.id ?? makeId(),
    name,
    doc: { ...doc, savedAt: Date.now(), savedName: name },
  };
  return {
    library: existing
      ? library.map((e) => (e.id === existing.id ? entry : e))
      : [...library, entry],
    entry,
  };
}

function defaultName(d: Doc): string {
  return d.savedName || `${d.type}-${d.meta.docNumber}`;
}

export const useStudio = create<StoreState>()(
  persist(
    (set, get) => ({
      doc: makeDefaultDoc("quotation"),
      library: [],

      setType: (t) => set({ doc: makeDefaultDoc(t) }),
      setMeta: (patch) =>
        set((s) => ({ doc: { ...s.doc, meta: { ...s.doc.meta, ...patch } } })),
      setPartyFrom: (patch) =>
        set((s) => ({
          doc: { ...s.doc, parties: { ...s.doc.parties, from: { ...s.doc.parties.from, ...patch } } },
        })),
      setPartyTo: (patch) =>
        set((s) => ({
          doc: { ...s.doc, parties: { ...s.doc.parties, to: { ...s.doc.parties.to, ...patch } } },
        })),

      setCurrency: (c) =>
        set((s) => ({
          doc: {
            ...s.doc,
            money: { ...s.doc.money, currency: c, taxRows: defaultTaxRows(c) },
          },
        })),
      setNumbering: (n) =>
        set((s) => ({ doc: { ...s.doc, money: { ...s.doc.money, numbering: n } } })),
      addTaxRow: () =>
        set((s) => ({
          doc: {
            ...s.doc,
            money: {
              ...s.doc.money,
              taxRows: [...s.doc.money.taxRows, { id: makeId(), label: "Tax", percent: 0 }],
            },
          },
        })),
      updateTaxRow: (id, patch) =>
        set((s) => ({
          doc: {
            ...s.doc,
            money: {
              ...s.doc.money,
              taxRows: s.doc.money.taxRows.map((t) => (t.id === id ? { ...t, ...patch } : t)),
            },
          },
        })),
      removeTaxRow: (id) =>
        set((s) => ({
          doc: {
            ...s.doc,
            money: { ...s.doc.money, taxRows: s.doc.money.taxRows.filter((t) => t.id !== id) },
          },
        })),

      addItem: () =>
        set((s) => ({
          doc: {
            ...s.doc,
            items: [...s.doc.items, { id: makeId(), title: "", sub: "", qty: 1, rate: 0 }],
          },
        })),
      updateItem: (id, patch) =>
        set((s) => ({
          doc: { ...s.doc, items: s.doc.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) },
        })),
      removeItem: (id) =>
        set((s) => ({ doc: { ...s.doc, items: s.doc.items.filter((it) => it.id !== id) } })),

      addClause: () =>
        set((s) => ({
          doc: {
            ...s.doc,
            clauses: [
              ...s.doc.clauses,
              { id: makeId(), title: "New Clause", bodyHtml: "<p></p>" },
            ],
          },
        })),
      updateClause: (id, patch) =>
        set((s) => ({
          doc: {
            ...s.doc,
            clauses: s.doc.clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),
      removeClause: (id) =>
        set((s) => ({ doc: { ...s.doc, clauses: s.doc.clauses.filter((c) => c.id !== id) } })),
      moveClause: (id, dir) =>
        set((s) => {
          const idx = s.doc.clauses.findIndex((c) => c.id === id);
          if (idx < 0) return s;
          const ni = idx + dir;
          if (ni < 0 || ni >= s.doc.clauses.length) return s;
          const next = [...s.doc.clauses];
          const [item] = next.splice(idx, 1);
          next.splice(ni, 0, item);
          return { doc: { ...s.doc, clauses: next } };
        }),

      setSignature: (patch) =>
        set((s) => ({ doc: { ...s.doc, signature: { ...s.doc.signature, ...patch } } })),
      setWatermark: (pos) => set((s) => ({ doc: { ...s.doc, watermark: pos } })),

      setPayment: (patch) =>
        set((s) => ({ doc: { ...s.doc, payment: { ...s.doc.payment, ...patch } } })),

      setBands: (patch) =>
        set((s) => ({ doc: { ...s.doc, bands: { ...s.doc.bands, ...patch } } })),

      setLayout: (id, patch) =>
        set((s) => ({ doc: { ...s.doc, ...writeOverride(s.doc, id, patch) } })),

      nudgeLayout: (id, ddx, ddy) =>
        set((s) => {
          const cur = readOverride(s.doc, id);
          return {
            doc: {
              ...s.doc,
              ...writeOverride(s.doc, id, { dx: cur.dx + ddx, dy: cur.dy + ddy }),
            },
          };
        }),

      setLayoutMode: (id, mode, seed) =>
        set((s) => ({
          doc: { ...s.doc, ...writeOverride(s.doc, id, { mode, ...(seed ?? {}) }) },
        })),

      resetLayout: (id) =>
        set((s) => {
          const c = capabilityFor(id);
          if (c.legacy) {
            const d = makeDefaultDoc(s.doc.type).bands;
            const bands = { ...s.doc.bands, [c.legacy.x]: d[c.legacy.x], [c.legacy.y]: d[c.legacy.y] };
            if (c.legacy.size) bands[c.legacy.size] = d[c.legacy.size];
            return { doc: { ...s.doc, bands } };
          }
          const next = { ...(s.doc.layout ?? {}) };
          delete next[id];
          return { doc: { ...s.doc, layout: next } };
        }),

      resetAllLayout: () =>
        set((s) => ({
          doc: { ...s.doc, layout: {}, bands: makeDefaultDoc(s.doc.type).bands },
        })),

      setLetter: (patch) =>
        set((s) => {
          const cur = s.doc.letter ?? {
            template: "general",
            title: "Letter",
            salutation: "",
            closing: "",
            closing2: "",
            signoff: "",
          };
          return { doc: { ...s.doc, letter: { ...cur, ...patch } } };
        }),

      applyLetterTemplate: (tpl: LetterTemplate) => {
        const t = LETTER_TEMPLATES[tpl];
        set((s) => ({
          doc: {
            ...s.doc,
            letter: {
              template: tpl,
              title: t.title,
              salutation: t.salutation,
              closing: t.closing,
              closing2: t.closing2,
              signoff: t.signoff,
            },
            clauses: t.clauses.map((c) => ({
              id: makeId(),
              title: c.title,
              bodyHtml: c.bodyHtml,
            })),
          },
        }));
      },

      saveAs: (name) => {
        const { doc, library } = get();
        const { library: next, entry } = upsert(library, name, doc);
        set({ library: next, doc: entry.doc });
      },
      loadFromLibrary: (id) => {
        const e = get().library.find((x) => x.id === id);
        if (e) set({ doc: e.doc });
      },
      renameInLibrary: (id, name) =>
        set((s) => ({ library: s.library.map((e) => (e.id === id ? { ...e, name } : e)) })),
      deleteFromLibrary: (id) =>
        set((s) => ({ library: s.library.filter((e) => e.id !== id) })),
      newDoc: (t) => set({ doc: makeDefaultDoc(t) }),

      convertToInvoice: (fromLibraryId) => {
        const state = get();
        const source = fromLibraryId
          ? state.library.find((e) => e.id === fromLibraryId)?.doc
          : state.doc;
        if (!source || source.type !== "quotation") return null;

        // 1. Auto-save the quotation so converting can never lose it.
        const saved = upsert(state.library, defaultName(source), source);

        // 2. Copy everything — items, taxes, clauses, parties, payment,
        //    signature, watermark, bands and layout all carry over.
        const invoice: Doc = {
          ...source,
          id: makeId(),
          type: "invoice",
          meta: {
            ...source.meta,
            docNumber: makeDocNumber("invoice"),
            date: new Date().toISOString().slice(0, 10),
            validity: undefined,
          },
          layout: { ...(source.layout ?? {}) },
          bands: { ...source.bands },
          convertedFrom: {
            id: source.id,
            type: source.type,
            docNumber: source.meta.docNumber,
          },
          savedName: undefined,
        };

        // 3. Auto-save the invoice too, and open it.
        const withInvoice = upsert(saved.library, defaultName(invoice), invoice);
        set({ library: withInvoice.library, doc: withInvoice.entry.doc });

        return {
          quotationNumber: source.meta.docNumber,
          invoiceNumber: invoice.meta.docNumber,
        };
      },

      // JSON import bypasses `migrate` entirely, so backfill the fields a
      // pre-v7 file will be missing rather than crashing on undefined.
      replaceDoc: (d) =>
        set({
          doc: {
            ...d,
            layout: d.layout ?? {},
            bands: { ...makeDefaultDoc(d.type).bands, ...(d.bands ?? {}) },
          },
        }),
    }),
    {
      name: "pd-studio-v1",
      version: 7,
      migrate: (persistedState: unknown, fromVersion: number) => {
        const s = persistedState as { doc?: Doc; library?: { id: string; name: string; doc: Doc }[] } | undefined;
        if (!s) return s;
        const defaultPayment = {
          upiId: "9316715060",
          bankAccount: "50100750274961",
          bankIfsc: "HDFC0001450",
          advancePaid: 0,
          thankYouNote: "Thanks for your business!",
          contactPhone: "+91 79901 98105",
          contactEmail: "business@primedigitals.co.in",
        };
        // Company email changed. These are the addresses we previously shipped as
        // defaults — rewrite those, but never clobber a value the user set themselves.
        const LEGACY_EMAILS = ["hello@primedigitals.io", "hello@primedigitals.example"];
        const defaultBands = {
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
        };
        // Migrate single `desc` items → {title, sub}
        const migrateItem = (
          it: { desc?: string; title?: string; sub?: string; qty: number; rate: number; id: string }
        ): import("./schema").Item => {
          if (typeof it.title === "string") {
            return {
              id: it.id,
              qty: it.qty,
              rate: it.rate,
              title: it.title,
              sub: it.sub ?? "",
            };
          }
          const desc = it.desc ?? "";
          const [first, ...rest] = desc.split("\n");
          return {
            id: it.id,
            qty: it.qty,
            rate: it.rate,
            title: first || "",
            sub: rest.join("\n"),
          };
        };
        const patchPayment = (d: Doc) => {
          const p = d.payment ?? defaultPayment;
          return LEGACY_EMAILS.includes(p.contactEmail)
            ? { ...p, contactEmail: defaultPayment.contactEmail }
            : p;
        };
        const patch = (d: Doc): Doc => ({
          ...d,
          payment: patchPayment(d),
          bands: { ...defaultBands, ...(d.bands ?? {}) },
          layout: d.layout ?? {},
          items: Array.isArray(d.items) ? d.items.map(migrateItem) : [],
        });
        if (s.doc) s.doc = patch(s.doc);
        if (Array.isArray(s.library)) {
          s.library = s.library.map((e) => ({ ...e, doc: patch(e.doc) }));
        }
        void fromVersion;
        return s;
      },
    }
  )
);
