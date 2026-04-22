"use client";

import { useRef } from "react";

type Props = {
  value?: string; // data URL
  onChange: (dataUrl: string | undefined) => void;
};

export function SignatureUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file) return;
    if (!/^image\/(png|svg\+xml|jpeg)$/.test(file.type)) {
      alert("Please upload a PNG, JPG, or SVG signature.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Signature"
            className="h-12 w-auto max-w-[180px] object-contain border border-dashed border-pd-gray rounded bg-white px-2"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-pd-muted hover:text-pd-navy underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-2 rounded-md border border-pd-navy text-pd-navy hover:bg-pd-navy hover:text-pd-white transition"
        >
          Upload signature (PNG / SVG)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
