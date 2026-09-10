"use client";

import { createContext, useContext } from "react";

export type StudioMode = "move" | "edit" | "preview";

export type LayoutCtxValue = {
  /** true inside the hidden measurement pass — everything must render inert */
  measuring: boolean;
  /** false in Preview mode and while printing — no chrome, no handlers */
  interactive: boolean;
  mode: StudioMode;
  selectedId: string | null;
  editingId: string | null;
  /** 0-based index of the page this subtree belongs to */
  pageIndex: number;
  select: (id: string | null) => void;
  beginEdit: (id: string | null) => void;
};

/**
 * Fail-safe default: anything rendered outside a provider behaves as if it were
 * being measured, so it can never accidentally attach handlers or editable DOM.
 */
export const MEASURE_CTX: LayoutCtxValue = {
  measuring: true,
  interactive: false,
  mode: "preview",
  selectedId: null,
  editingId: null,
  pageIndex: 0,
  select: () => {},
  beginEdit: () => {},
};

export const LayoutCtx = createContext<LayoutCtxValue>(MEASURE_CTX);

export function useLayoutCtx(): LayoutCtxValue {
  return useContext(LayoutCtx);
}
