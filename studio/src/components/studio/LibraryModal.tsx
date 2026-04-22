"use client";

import { useStudio } from "@/lib/store";
import { DOC_TYPE_LABELS } from "@/lib/schema";

export function LibraryModal({ onClose }: { onClose: () => void }) {
  const library = useStudio((s) => s.library);
  const loadFromLibrary = useStudio((s) => s.loadFromLibrary);
  const renameInLibrary = useStudio((s) => s.renameInLibrary);
  const deleteFromLibrary = useStudio((s) => s.deleteFromLibrary);

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-hdr">
          <h3>Library</h3>
          <button className="pd-icon-btn" onClick={onClose}>✕</button>
        </div>
        {library.length === 0 ? (
          <div className="pd-empty" style={{ padding: 20 }}>
            No saved documents yet. Use “Save to library” to add one.
          </div>
        ) : (
          <ul className="pd-lib-list">
            {library
              .slice()
              .sort((a, b) => b.doc.savedAt - a.doc.savedAt)
              .map((e) => (
                <li key={e.id} className="pd-lib-item">
                  <div>
                    <div className="pd-lib-name">{e.name}</div>
                    <div className="pd-lib-meta">
                      {DOC_TYPE_LABELS[e.doc.type]} · {e.doc.meta.docNumber} ·{" "}
                      {new Date(e.doc.savedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="pd-lib-actions">
                    <button
                      className="pd-btn pd-btn--primary"
                      onClick={() => {
                        loadFromLibrary(e.id);
                        onClose();
                      }}
                    >
                      Load
                    </button>
                    <button
                      className="pd-btn pd-btn--ghost"
                      onClick={() => {
                        const name = prompt("New name", e.name);
                        if (name && name.trim()) renameInLibrary(e.id, name.trim());
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="pd-btn pd-btn--danger"
                      onClick={() => {
                        if (confirm(`Delete "${e.name}"?`)) deleteFromLibrary(e.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
