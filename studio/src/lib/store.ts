"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Clause,
  Currency,
  Doc,
  DocType,
  Item,
  Numbering,
  Party,
  TaxRow,
  WatermarkPos,
} from "./schema";
import { defaultTaxRows, makeDefaultDoc, makeId } from "./schema";

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

  // library
  saveAs: (name: string) => void;
  loadFromLibrary: (id: string) => void;
  renameInLibrary: (id: string, name: string) => void;
  deleteFromLibrary: (id: string) => void;
  newDoc: (t: DocType) => void;

  // IO
  replaceDoc: (d: Doc) => void;
};

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
            items: [...s.doc.items, { id: makeId(), desc: "", qty: 1, rate: 0 }],
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

      saveAs: (name) => {
        const { doc, library } = get();
        const existing = library.find((e) => e.name.toLowerCase() === name.toLowerCase());
        const entry: LibraryEntry = {
          id: existing?.id ?? makeId(),
          name,
          doc: { ...doc, savedAt: Date.now(), savedName: name },
        };
        const next = existing
          ? library.map((e) => (e.id === existing.id ? entry : e))
          : [...library, entry];
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

      replaceDoc: (d) => set({ doc: d }),
    }),
    {
      name: "pd-studio-v1",
      version: 1,
    }
  )
);
