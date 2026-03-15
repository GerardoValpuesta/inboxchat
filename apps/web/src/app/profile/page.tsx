"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getOperatorFromToken(): { name: string; email: string; role: string } | null {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      name?: string; email?: string; role?: string;
    };
    return { name: payload.name ?? "", email: payload.email ?? "", role: payload.role ?? "" };
  } catch { return null; }
}

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    const op = getOperatorFromToken();
    if (!op) { router.push("/login"); return; }
    setName(op.name);
    setEmail(op.email);
    setRole(op.role);
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/me`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await res.json() as { ok?: boolean; token?: string; name?: string; error?: string };
      if (res.ok && d.token) {
        localStorage.setItem("ic_token", d.token);
        setProfileMsg("✓ Nombre actualizado");
        setTimeout(() => setProfileMsg(""), 3000);
      } else {
        setProfileMsg(`Error: ${d.error ?? "no se pudo guardar"}`);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg("Mínimo 8 caracteres");
      return;
    }
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/me`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json() as { ok?: boolean; token?: string; error?: string };
      if (res.ok && d.token) {
        localStorage.setItem("ic_token", d.token);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg("✓ Contraseña actualizada");
        setTimeout(() => setPasswordMsg(""), 3000);
      } else {
        setPasswordMsg(`Error: ${d.error ?? "no se pudo cambiar"}`);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/inbox")}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-4 transition-colors"
          >
            ← Volver al inbox
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
          <p className="text-slate-500 text-sm mt-1">Actualizá tu nombre y contraseña</p>
        </div>

        <div className="space-y-4">
          {/* Avatar + info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-xl font-bold text-violet-700 flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{name || "—"}</p>
              <p className="text-sm text-slate-500">{email}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                role === "owner" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
              }`}>
                {role === "owner" ? "Owner" : "Agent"}
              </span>
            </div>
          </div>

          {/* Nombre */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Nombre</h2>
            <form onSubmit={(e) => void saveProfile(e)} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? "Guardando..." : "Guardar"}
                </button>
                {profileMsg && (
                  <p className={`text-xs ${profileMsg.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
                    {profileMsg}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Contraseña */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Cambiar contraseña</h2>
            <form onSubmit={(e) => void savePassword(e)} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  {savingPassword ? "Guardando..." : "Cambiar contraseña"}
                </button>
                {passwordMsg && (
                  <p className={`text-xs ${passwordMsg.startsWith("Error") ? "text-red-600" : "text-emerald-600"}`}>
                    {passwordMsg}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
