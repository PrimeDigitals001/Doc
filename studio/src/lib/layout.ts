import type { BandControls, Doc, LayoutOverride } from "./schema";
import { EMPTY_OVERRIDE, makeDefaultDoc } from "./schema";

/**
 * Some elements pre-date the `doc.layout` map and are still positioned by
 * `doc.bands.*`. Rather than migrating that data, `readOverride`/`writeOverride`
 * transparently route those ids to and from `doc.bands` — so the sidebar sliders
 * and drag edit the exact same number and stay in sync for free.
 */
type LegacyBinding = {
  x: keyof BandControls;
  y: keyof BandControls;
  size?: keyof BandControls;
  /** value is a position from the anchor edge, not a delta from centre */
  absoluteX?: boolean;
  /** anchored to the right edge — dragging right *decreases* the stored value */
  invertX?: boolean;
};

export type LayoutCapability = {
  id: string;
  label: string;
  canDrag: boolean;
  canDetach: boolean;
  canResize: false | "both" | "x" | "y";
  legacy?: LegacyBinding;
};

const cap = (
  id: string,
  label: string,
  extra: Partial<Omit<LayoutCapability, "id" | "label">> = {}
): LayoutCapability => ({
  id,
  label,
  canDrag: true,
  canDetach: false,
  canResize: false,
  ...extra,
});

export const LAYOUT_ELEMENTS: Record<string, LayoutCapability> = {
  // --- band chrome: still stored in doc.bands ---
  topband: cap("topband", "Top band", {
    legacy: { x: "topOffsetX", y: "topOffsetY" },
  }),
  logo: cap("logo", "Logo", {
    canResize: "both",
    legacy: { x: "topLogoLeft", y: "topLogoTop", size: "topLogoSize", absoluteX: true },
  }),
  title: cap("title", "Doc title", {
    canResize: "both",
    legacy: {
      x: "topTitleRight",
      y: "topTitleTop",
      size: "topTitleSize",
      absoluteX: true,
      invertX: true,
    },
  }),
  bottomband: cap("bottomband", "Bottom band", {
    legacy: { x: "bottomOffsetX", y: "bottomOffsetY" },
  }),
  contact: cap("contact", "Contact info", {
    legacy: { x: "contactOffsetX", y: "contactOffsetY" },
  }),
  stamp: cap("stamp", "Stamp / signature", {
    canResize: "both",
    legacy: { x: "stampOffsetX", y: "stampOffsetY", size: "stampSize" },
  }),

  // --- content blocks: stored in doc.layout ---
  "header-row": cap("header-row", "Recipient + ID", { canDetach: true, canResize: "x" }),
  "items-table": cap("items-table", "Items table", { canResize: "x" }),
  payrow: cap("payrow", "Payment + totals", { canDetach: true, canResize: "x" }),
  payment: cap("payment", "Payment method", { canDetach: true, canResize: "x" }),
  totals: cap("totals", "Totals", { canDetach: true, canResize: "x" }),
  terms: cap("terms", "Terms & conditions", { canDetach: true, canResize: "x" }),
  thanks: cap("thanks", "Thank-you note", { canDetach: true, canResize: "x" }),
  stampRow: cap("stampRow", "Contact + stamp row", { canDetach: true, canResize: "x" }),
  pagenum: cap("pagenum", "Page number", { canDetach: true }),

  // --- letter blocks ---
  "letter-date": cap("letter-date", "Date", { canResize: "x" }),
  "letter-title": cap("letter-title", "Letter title", { canResize: "x" }),
  "letter-salutation": cap("letter-salutation", "Salutation", { canResize: "x" }),
  "letter-closing": cap("letter-closing", "Closing", { canResize: "x" }),
  "letter-signoff": cap("letter-signoff", "Sign-off", { canResize: "x" }),
};

const FALLBACK = cap("unknown", "Element");

/** Resolves dynamic ids (`item-<id>`, `clause-<id>`, `letter-body-<id>`) too. */
export function capabilityFor(id: string): LayoutCapability {
  const known = LAYOUT_ELEMENTS[id];
  if (known) return known;
  // Items and flow clauses live inside the paginated flow — nudge only, never detach.
  if (id.startsWith("item-")) return { ...FALLBACK, id, label: "Line item" };
  if (id.startsWith("clause-")) return { ...FALLBACK, id, label: "Clause", canResize: "x" };
  if (id.startsWith("letter-body-")) return { ...FALLBACK, id, label: "Paragraph", canResize: "x" };
  return { ...FALLBACK, id };
}

/** Never throws on a doc missing `layout` (old JSON imports). */
export function readOverride(doc: Doc, id: string): LayoutOverride {
  const c = capabilityFor(id);
  if (c.legacy) {
    const b = doc.bands;
    if (!b) return EMPTY_OVERRIDE;
    const x = Number(b[c.legacy.x] ?? 0);
    // NB: `size` is deliberately not surfaced as `w` — for the logo it maps to a
    // height, not a width. Sizes stay on the sidebar sliders.
    return { dx: c.legacy.invertX ? -x : x, dy: Number(b[c.legacy.y] ?? 0) };
  }
  return doc.layout?.[id] ?? EMPTY_OVERRIDE;
}

/**
 * Returns the `bands`/`layout` slices to merge into the doc. Single entry point,
 * so the legacy adapter and its sign quirks live in exactly one place.
 */
export function writeOverride(
  doc: Doc,
  id: string,
  patch: Partial<LayoutOverride>
): Pick<Doc, "bands" | "layout"> {
  const c = capabilityFor(id);
  const layout = doc.layout ?? {};

  if (c.legacy) {
    const bands = { ...doc.bands };
    if (patch.dx !== undefined) {
      bands[c.legacy.x] = c.legacy.invertX ? -patch.dx : patch.dx;
    }
    if (patch.dy !== undefined) bands[c.legacy.y] = patch.dy;
    if (patch.w !== undefined && c.legacy.size) bands[c.legacy.size] = patch.w;
    return { bands, layout };
  }

  const prev = layout[id] ?? EMPTY_OVERRIDE;
  return { bands: doc.bands, layout: { ...layout, [id]: { ...prev, ...patch } } };
}

/** True when the element sits at its factory position (drives the ↺ affordance). */
export function isDefault(doc: Doc, id: string): boolean {
  const c = capabilityFor(id);
  if (c.legacy) {
    const d = makeDefaultDoc(doc.type).bands;
    return (
      doc.bands[c.legacy.x] === d[c.legacy.x] &&
      doc.bands[c.legacy.y] === d[c.legacy.y] &&
      (!c.legacy.size || doc.bands[c.legacy.size] === d[c.legacy.size])
    );
  }
  const ov = doc.layout?.[id];
  if (!ov) return true;
  return (
    ov.dx === 0 &&
    ov.dy === 0 &&
    ov.w === undefined &&
    ov.h === undefined &&
    (ov.mode ?? "flow") === "flow"
  );
}

/** Ids whose position currently differs from the factory default. */
export function movedElementIds(doc: Doc): string[] {
  const ids = new Set<string>([
    ...Object.keys(LAYOUT_ELEMENTS).filter((id) => LAYOUT_ELEMENTS[id].legacy),
    ...Object.keys(doc.layout ?? {}),
  ]);
  return [...ids].filter((id) => !isDefault(doc, id));
}
