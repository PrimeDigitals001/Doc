"use client";

import { useRef } from "react";
import { useStudio } from "@/lib/store";
import { capabilityFor, isDefault, readOverride } from "@/lib/layout";
import { useLayoutCtx } from "./layout-context";

type Tag = "div" | "span" | "section" | "table" | "ol" | "h1" | "td";

/**
 * How dx/dy map to CSS. Elements already absolutely positioned inside the band
 * (logo, title) are anchored to an edge and vertically centred, so a plain
 * translate would fight their existing centring transform.
 */
export type Anchor = "translate" | "leftCentered" | "rightCentered";

type Props = {
  /** stable layout id — see LAYOUT_ELEMENTS in lib/layout.ts */
  id: string;
  as?: Tag;
  anchor?: Anchor;
  className?: string;
  style?: React.CSSProperties;
  /** element's own baseline styling, applied under the position styles */
  baseStyle?: React.CSSProperties;
  children: React.ReactNode;
};

function positionStyle(anchor: Anchor, x: number, y: number): React.CSSProperties {
  switch (anchor) {
    case "leftCentered":
      return { left: x, transform: `translateY(calc(-50% + ${y}px))` };
    case "rightCentered":
      // stored value is a right-offset, so dragging right (+dx) must shrink it
      return { right: -x, transform: `translateY(calc(-50% + ${y}px))` };
    default:
      return { transform: `translate(${x}px, ${y}px)` };
  }
}

const SNAP = 4;
const MOVE_THRESHOLD = 3;
/** keep at least this much of the element on the page */
const KEEP_VISIBLE = 24;
/** our own double-click window — see the note in onPointerDown */
const DOUBLE_MS = 450;
const DOUBLE_SLOP_PX = 6;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Wraps a document element so it can be selected and dragged on the page.
 *
 * The one rule that matters: during a drag we write `style` straight to the DOM
 * node and NEVER touch the store. FigmaPreview re-measures and re-paginates the
 * whole document on every render, so a store write per pointermove would
 * re-measure per frame. We commit exactly once, on pointer-up.
 */
export function Positionable({
  id,
  as = "div",
  anchor = "translate",
  className,
  style,
  baseStyle,
  children,
}: Props) {
  const { measuring, interactive, selectedId, editingId, pageIndex, select, beginEdit } =
    useLayoutCtx();
  const doc = useStudio((s) => s.doc);
  const setLayout = useStudio((s) => s.setLayout);
  const nudgeLayout = useStudio((s) => s.nudgeLayout);
  const resetLayout = useStudio((s) => s.resetLayout);
  const setLayoutMode = useStudio((s) => s.setLayoutMode);

  const ref = useRef<HTMLElement>(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0, target: "" });
  const drag = useRef<{
    pid: number;
    sx: number;
    sy: number;
    baseX: number;
    baseY: number;
    scale: number;
    moved: boolean;
    lx: number;
    ly: number;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
  } | null>(null);

  const Tag = as as React.ElementType;
  const ov = readOverride(doc, id);
  const cap = capabilityFor(id);
  const free = ov.mode === "free";

  // ---- 1. MEASUREMENT PASS: completely inert ----------------------------
  // Detached elements contribute zero height to the flow, which is what makes
  // detaching actually free up page space.
  if (measuring) {
    if (free) return null;
    return (
      <Tag className={className} style={{ ...baseStyle, ...style }}>
        {children}
      </Tag>
    );
  }

  const posStyle: React.CSSProperties = free
    ? {
        position: "absolute",
        left: ov.dx,
        top: ov.dy,
        width: ov.w,
        zIndex: 2 + (ov.z ?? 0),
      }
    : { ...positionStyle(anchor, ov.dx, ov.dy), width: ov.w };

  const merged: React.CSSProperties = { ...baseStyle, ...style, ...posStyle };

  // ---- 2. NON-INTERACTIVE (Preview mode / print): positioned, no chrome ----
  if (!interactive || !cap.canDrag) {
    return (
      <Tag className={className} style={merged}>
        {children}
      </Tag>
    );
  }

  // ---- 3. INTERACTIVE ----------------------------------------------------
  const selected = selectedId === id;

  function applyLive(el: HTMLElement, x: number, y: number) {
    if (free) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      return;
    }
    const s = positionStyle(anchor, x, y);
    el.style.transform = String(s.transform ?? "");
    if (s.left !== undefined) el.style.left = `${s.left as number}px`;
    if (s.right !== undefined) el.style.right = `${s.right as number}px`;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    // A live text field owns the pointer — don't hijack it into a drag.
    if ((e.target as HTMLElement).closest("[data-inline-editing='true']")) return;

    const el = ref.current;
    if (!el) return;
    const page = el.closest(".fg-page") as HTMLElement | null;
    if (!page) return;

    /* Double-click on text opens the inline editor.
       We have to detect the double-tap ourselves: the preventDefault() below
       suppresses the browser's compatibility mouse events, so neither `dblclick`
       nor a click count ever reaches us (and PointerEvent.detail is specified to
       be 0 regardless). Two pointerdowns close together in time and space on the
       same text node count as a double-click. */
    const inline = (e.target as HTMLElement).closest<HTMLElement>("[data-inline-id]");
    const inlineId = inline?.dataset.inlineId ?? "";
    const prev = lastTap.current;
    const isDouble =
      !!inline &&
      inlineId === prev.target &&
      e.timeStamp - prev.t < DOUBLE_MS &&
      Math.abs(e.clientX - prev.x) < DOUBLE_SLOP_PX &&
      Math.abs(e.clientY - prev.y) < DOUBLE_SLOP_PX;
    lastTap.current = { t: e.timeStamp, x: e.clientX, y: e.clientY, target: inlineId };

    if (isDouble) {
      e.preventDefault();
      e.stopPropagation();
      select(id);
      beginEdit(inlineId);
      return;
    }

    e.preventDefault(); // kills text selection + native <img> drag
    e.stopPropagation(); // the nearest Positionable wins, not an ancestor

    // 1 today (no zoom transform on the preview), but defensive so a future
    // zoom control doesn't silently make drag drift from the cursor.
    const scale = page.getBoundingClientRect().width / page.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    const p = page.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);
    drag.current = {
      pid: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      baseX: ov.dx,
      baseY: ov.dy,
      scale,
      moved: false,
      lx: ov.dx,
      ly: ov.dy,
      bounds: {
        minX: ov.dx - (r.right - p.left - KEEP_VISIBLE) / scale,
        maxX: ov.dx + (p.right - r.left - KEEP_VISIBLE) / scale,
        minY: ov.dy - (r.bottom - p.top - KEEP_VISIBLE) / scale,
        maxY: ov.dy + (p.bottom - r.top - KEEP_VISIBLE) / scale,
      },
    };
    select(id);
    document.body.classList.add("pd-dragging");
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    let ddx = (e.clientX - d.sx) / d.scale;
    let ddy = (e.clientY - d.sy) / d.scale;
    if (Math.abs(ddx) + Math.abs(ddy) > MOVE_THRESHOLD) d.moved = true;
    if (e.shiftKey) {
      if (Math.abs(ddx) >= Math.abs(ddy)) ddy = 0;
      else ddx = 0;
    }
    const grid = e.altKey ? 1 : SNAP;
    d.lx = clamp(Math.round((d.baseX + ddx) / grid) * grid, d.bounds.minX, d.bounds.maxX);
    d.ly = clamp(Math.round((d.baseY + ddy) / grid) * grid, d.bounds.minY, d.bounds.maxY);
    if (ref.current) applyLive(ref.current, d.lx, d.ly);
  }

  function endDrag(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    document.body.classList.remove("pd-dragging");
    try {
      ref.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture already released */
    }
    if (!d) return;
    if (!d.moved) return; // a click, not a drag → selection only
    setLayout(id, { dx: d.lx, dy: d.ly }); // ← the single store commit
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Only when the wrapper itself is focused, so a focused contentEditable
    // child keeps its own arrow-key behaviour.
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nudgeLayout(id, -step, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        nudgeLayout(id, step, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        nudgeLayout(id, 0, -step);
        break;
      case "ArrowDown":
        e.preventDefault();
        nudgeLayout(id, 0, step);
        break;
      case "Escape":
        select(null);
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        resetLayout(id);
        break;
    }
  }

  /**
   * Flow ↔ free. Detaching seeds the element's current on-screen position so it
   * doesn't jump, then removes it from the flow entirely — the measurement pass
   * renders `null` for a free element, so the space it occupied closes up and
   * pagination reclaims it.
   */
  function toggleFree() {
    const el = ref.current;
    if (!el) return;
    if (free) {
      setLayoutMode(id, "flow", { dx: 0, dy: 0, page: pageIndex });
      return;
    }
    const body = el.closest(".fg-body") as HTMLElement | null;
    if (!body) return;
    const r = el.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    // An absolutely positioned box still applies its own margins on top of
    // left/top, so seed them out or the element jumps by its margin.
    const cs = getComputedStyle(el);
    const ml = parseFloat(cs.marginLeft) || 0;
    const mt = parseFloat(cs.marginTop) || 0;
    setLayoutMode(id, "free", {
      dx: Math.round(r.left - b.left - ml),
      dy: Math.round(r.top - b.top - mt),
      page: pageIndex,
      w: Math.round(r.width),
    });
  }

  const cls = [
    "pd-pos",
    className,
    selected ? "is-selected" : "",
    free ? "is-free" : "",
    editingId === id ? "is-editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={ref}
      className={cls}
      style={merged}
      /* NOT `id` — the measurement pass renders the same tree, so a real DOM id
         would be a genuine duplicate. */
      data-layout-id={id}
      data-draggable="true"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown}
    >
      {selected && (
        <span className="pd-pos__chrome pd-no-print" contentEditable={false}>
          <span className="pd-pos__badge">{cap.label}</span>
          {cap.canDetach && (
            <button
              type="button"
              className={`pd-pos__btn${free ? " is-on" : ""}`}
              title={
                free
                  ? "Put this back into the normal flow"
                  : "Detach: place this freely anywhere on the page"
              }
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleFree}
            >
              {free ? "⇲ Dock" : "⇱ Free"}
            </button>
          )}
          {!isDefault(doc, id) && (
            <button
              type="button"
              className="pd-pos__btn"
              title="Reset position"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => resetLayout(id)}
            >
              ↺
            </button>
          )}
        </span>
      )}
      {children}
    </Tag>
  );
}
