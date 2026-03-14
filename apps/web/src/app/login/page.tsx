"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as {
        token?: string;
        error?: string;
        operator?: { name: string; workspaceId: string };
      };

      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }

      if (data.token) {
        localStorage.setItem("ic_token", data.token);
        // Cookie para el middleware de Next.js (que corre server-side)
        document.cookie = `ic_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        router.push("/inbox");
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">InboxChat</h1>
          <p className="text-sm text-slate-500 mt-1">Accedé a tu dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@empresa.com"
                required
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-slate-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs text-violet-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="········"
                required
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-slate-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          No tenés cuenta?{" "}
          <Link href="/signup" className="text-violet-600 font-medium hover:underline">
            Empezar gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
