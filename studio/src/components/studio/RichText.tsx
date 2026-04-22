"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

const CMDS = [
  { cmd: "bold", label: "B", title: "Bold", style: "font-weight:700" },
  { cmd: "italic", label: "I", title: "Italic", style: "font-style:italic" },
  { cmd: "underline", label: "U", title: "Underline", style: "text-decoration:underline" },
  { cmd: "formatBlock:H2", label: "H1", title: "Heading" },
  { cmd: "formatBlock:H3", label: "H2", title: "Subheading" },
  { cmd: "insertUnorderedList", label: "•", title: "Bulleted list" },
  { cmd: "insertOrderedList", label: "1.", title: "Numbered list" },
  { cmd: "justifyLeft", label: "L", title: "Align left" },
  { cmd: "justifyCenter", label: "C", title: "Align center" },
  { cmd: "justifyRight", label: "R", title: "Align right" },
];

export function RichText({ value, onChange, placeholder, minHeight = 80 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // keep DOM in sync only when value is externally changed (not on every keystroke)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  function exec(cmd: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (cmd.startsWith("formatBlock:")) {
      const block = cmd.split(":")[1];
      document.execCommand("formatBlock", false, block);
    } else if (cmd === "createLink") {
      const url = prompt("Enter URL");
      if (url) document.execCommand("createLink", false, url);
    } else {
      document.execCommand(cmd, false);
    }
    onChange(el.innerHTML);
  }

  return (
    <div className="rt">
      <div className="rt-toolbar">
        {CMDS.map((c) => (
          <button
            key={c.cmd}
            type="button"
            title={c.title}
            onMouseDown={(e) => {
              e.preventDefault();
              exec(c.cmd);
            }}
            style={c.style ? { ...parseStyle(c.style) } : undefined}
            className="rt-btn"
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          className="rt-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("createLink");
          }}
        >
          🔗
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rt-area"
        style={{ minHeight }}
        data-placeholder={placeholder || "Write here…"}
        onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
        onBlur={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}

function parseStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  s.split(";").forEach((pair) => {
    const [k, v] = pair.split(":").map((x) => x.trim());
    if (!k || !v) return;
    out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  });
  return out;
}
