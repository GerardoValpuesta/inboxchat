"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token
    ? { Authorization: `Bearer ${token}` }
    : { "X-Workspace-Key": "dev_key_inboxchat_local" };
}

const PRESET_COLORS = [
  "#6366f1", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#14b8a6", // teal
  "#f97316", // orange
  "#64748b", // slate
];

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function TagsSettingsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]!);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/tags`, { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json() as Promise<{ tags: Tag[] }>;
      })
      .then((d) => { if (d) setTags(d.tags ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/tags`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor }),
      });
      const d = await res.json() as { tag?: Tag; error?: string };
      if (res.ok && d.tag) {
        setTags((prev) => [...prev, d.tag!].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
      } else {
        setError(d.error ?? "Error al crear tag");
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteTag(id: string) {
    setDeletingId(id);
    try {
      await fetch(`${SERVER_URL}/api/tags/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      setTags((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => router.push("/settings")}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
            >
              ← Settings
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
          <p className="text-slate-500 text-sm mt-1">
            Los tags te permiten categorizar conversaciones por tipo de issue, canal o prioridad.
          </p>
        </div>

        {/* Crear nuevo tag */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Nuevo tag</h2>
          <form onSubmit={(e) => void addTag(e)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="bug, feature-request, churn-risk..."
                maxLength={30}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: newColor === c ? `3px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                    title={c}
                  />
                ))}
                {/* Color custom */}
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-7 h-7 rounded-full border border-slate-200 cursor-pointer overflow-hidden p-0"
                  title="Color personalizado"
                />
              </div>
            </div>

            {/* Preview */}
            {newName.trim() && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Preview:</span>
                <span
                  className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: newColor + "22",
                    color: newColor,
                    border: `1px solid ${newColor}44`,
                  }}
                >
                  {newName.trim()}
                </span>
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "Creando..." : "Crear tag"}
            </button>
          </form>
        </div>

        {/* Lista de tags */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Tags del workspace
              <span className="ml-2 text-xs font-medium text-slate-400">{tags.length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="w-5 h-5 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Todavía sin tags</p>
              <p className="text-xs text-slate-300 mt-1">Creá el primero arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: tag.color + "22",
                      color: tag.color,
                      border: `1px solid ${tag.color}44`,
                    }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => void deleteTag(tag.id)}
                    disabled={deletingId === tag.id}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Eliminar tag"
                  >
                    {deletingId === tag.id ? "..." : "Eliminar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-slate-400 text-center mt-4">
          Los tags se asignan desde el header de cada conversación en el inbox.
        </p>
      </div>
    </div>
  );
}
