"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Props {
  conversationId: string;
}

/**
 * ConvTagsPanel — sección reutilizable que muestra los tags de una conversación
 * y permite asignar/quitar tags directamente desde el panel lateral.
 */
export function ConvTagsPanel({ conversationId }: Props) {
  const [convTags, setConvTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, allRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/conversations/${conversationId}/tags`, { headers: getAuthHeaders() }),
        fetch(`${SERVER_URL}/api/tags`, { headers: getAuthHeaders() }),
      ]);
      if (convRes.ok) setConvTags(((await convRes.json()) as { tags: Tag[] }).tags);
      if (allRes.ok) setAllTags(((await allRes.json()) as { tags: Tag[] }).tags);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { void loadTags(); }, [loadTags]);

  // Cerrar el picker al hacer click fuera
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  async function toggleTag(tag: Tag) {
    const isAssigned = convTags.some((t) => t.id === tag.id);
    const method = isAssigned ? "DELETE" : "POST";
    await fetch(
      `${SERVER_URL}/api/conversations/${conversationId}/tags/${tag.id}`,
      { method, headers: getAuthHeaders() }
    );
    setConvTags((prev) =>
      isAssigned ? prev.filter((t) => t.id !== tag.id) : [...prev, tag]
    );
  }

  const unassigned = allTags.filter((t) => !convTags.some((ct) => ct.id === t.id));

  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tags</p>
        {allTags.length > 0 && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="text-[11px] text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            + Agregar
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
      ) : (
        <>
          {/* Tags asignados */}
          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
            {convTags.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Sin tags</span>
            ) : (
              convTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => void toggleTag(tag)}
                  className="group flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                  style={{ background: tag.color + "22", color: tag.color }}
                  title="Quitar tag"
                >
                  {tag.name}
                  <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))
            )}
          </div>

          {/* Picker de tags disponibles */}
          {showPicker && unassigned.length > 0 && (
            <div
              ref={pickerRef}
              className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-10"
            >
              <p className="text-[10px] text-slate-400 px-1 mb-1.5">Click para asignar</p>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => { void toggleTag(tag); if (unassigned.length === 1) setShowPicker(false); }}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ background: tag.color + "22", color: tag.color }}
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allTags.length === 0 && (
            <p className="text-[10px] text-slate-400 mt-1">
              Creá tags en{" "}
              <a href="/settings/tags" className="text-violet-500 hover:underline">Settings → Tags</a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
