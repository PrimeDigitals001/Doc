"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLayoutCtx } from "./layout-context";

// The studio is client-only (page.tsx gates on `mounted`), but guard anyway.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Tag = "span" | "div" | "h1" | "h3" | "strong";

type Props = {
  /** unique id for edit tracking, e.g. "contact-email" or `item-${id}-title` */
  id: string;
  value: string;
  onCommit: (next: string) => void;
  as?: Tag;
  className?: string;
  style?: React.CSSProperties;
  /** preserve newlines (addresses, item subtitles) */
  multiline?: boolean;
  /** rich text — syncs innerHTML instead of textContent */
  html?: boolean;
  /** commit as a number; rejects NaN */
  numeric?: boolean;
  placeholder?: string;
};

/**
 * Double-click-to-edit text rendered directly on the document page.
 *
 * Caret-safety contract (generalised from RichText.tsx):
 *  1. The editable node never receives React children and never
 *     dangerouslySetInnerHTML — if React owned its content, every store update
 *     would blow away the caret.
 *  2. We sync from `value` via an effect, and only while the node isn't focused.
 *  3. onInput writes to a local ref only. No store call — a store write per
 *     keystroke would re-paginate the whole document on every character.
 *  4. Commit on blur / Enter (single-line); Escape reverts.
 */
export function InlineText({
  id,
  value,
  onCommit,
  as = "span",
  className,
  style,
  multiline,
  html,
  numeric,
  placeholder,
}: Props) {
  const { measuring, interactive, editingId, beginEdit } = useLayoutCtx();
  const ref = useRef<HTMLElement>(null);
  const editing = editingId === id;
  const Tag = as as React.ElementType;

  // Sync DOM ← value, but never while the user is typing into it. A layout
  // effect (not useEffect) so the text is painted in its first frame — the node
  // deliberately renders with no React children, see the contract above.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || el === document.activeElement) return;
    if (html) {
      if (el.innerHTML !== value) el.innerHTML = value || "";
    } else if (el.textContent !== value) {
      el.textContent = value || "";
    }
  }, [value, html, editing]);

  // Focus + select-all when edit mode begins.
  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  // ---- MEASUREMENT PASS: plain text children, no ref, no handlers ----
  // Identical height, which is all the measurement cares about.
  if (measuring || !interactive) {
    if (html) {
      return (
        <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: value }} />
      );
    }
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  function commit() {
    const el = ref.current;
    if (!el) return;
    const next = html ? el.innerHTML : (el.textContent ?? "");
    if (numeric) {
      const n = Number(next.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) {
        el.textContent = value; // reject, restore
      } else if (String(n) !== value) {
        onCommit(String(n));
      }
    } else if (next !== value) {
      onCommit(next);
    }
    beginEdit(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation(); // don't let arrows reach Positionable's nudge handler
    if (e.key === "Escape") {
      e.preventDefault();
      const el = ref.current;
      if (el) {
        if (html) el.innerHTML = value;
        else el.textContent = value;
      }
      beginEdit(null);
      (e.target as HTMLElement).blur();
      return;
    }
    if (e.key === "Enter" && !multiline && !html) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }

  return (
    <Tag
      ref={ref}
      className={[className, "pd-inline", editing ? "is-editing" : ""].filter(Boolean).join(" ")}
      style={style}
      /* undefined, not false — so `[contenteditable]` selectors don't match
         every label on the page when nothing is being edited */
      contentEditable={editing ? true : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      data-inline-id={id}
      data-inline-editing={editing ? "true" : undefined}
      data-placeholder={placeholder}
      data-empty={!value ? "true" : undefined}
      title={editing ? undefined : "Double-click to edit"}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        beginEdit(id);
      }}
      onPointerDown={(e: React.PointerEvent) => {
        // Once editing, the pointer belongs to the caret, not to drag.
        if (editing) e.stopPropagation();
      }}
      /* Deliberately no onInput→store call: a store write per keystroke would
         re-measure and re-paginate the whole document on every character. */
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
