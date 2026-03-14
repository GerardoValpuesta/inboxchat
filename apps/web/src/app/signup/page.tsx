"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

interface SignupResponse {
  token?: string;
  error?: string;
  workspace?: { apiKey: string; name: string };
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, workspaceName }),
      });

      const data = (await res.json()) as SignupResponse;

      if (!res.ok) {
        setError(data.error ?? "Error al crear la cuenta");
        return;
      }

      if (data.token) {
        localStorage.setItem("ic_token", data.token);
        document.cookie = `ic_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        // Mostrar el apiKey antes de ir al inbox
        if (data.workspace?.apiKey) {
          setApiKey(data.workspace.apiKey);
        } else {
          router.push("/inbox");
        }
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  }

  // Pantalla de bienvenida con el API key
  if (apiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Tu cuenta está lista!</h1>
          <p className="text-slate-500 text-sm mb-8">
            Copiá este script y pegalo antes del <code className="bg-slate-100 px-1 rounded">{`</body>`}</code> de tu web.
          </p>

          <div className="bg-slate-900 rounded-xl p-4 text-left mb-6">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap overflow-x-auto">{`<script>
  window.InboxChat = {
    workspaceKey: "${apiKey}",
    serverUrl: "https://inboxchatserver-production.up.railway.app"
  };
</script>
<script src="https://inboxchatserver-production.up.railway.app/widget.js"></script>`}</pre>
          </div>

          <button
            onClick={() => {
              const text = `<script>\n  window.InboxChat = {\n    workspaceKey: "${apiKey}",\n    serverUrl: "https://inboxchatserver-production.up.railway.app"\n  };\n</script>\n<script src="https://inboxchatserver-production.up.railway.app/widget.js"></script>`;
              void navigator.clipboard.writeText(text);
            }}
            className="w-full mb-3 py-2.5 px-4 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-100 transition-colors font-medium"
          >
            📋 Copiar snippet
          </button>

          <button
            onClick={() => router.push("/inbox")}
            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md"
          >
            Ir al inbox →
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Tu trial gratuito dura 14 días · 100 conversaciones incluidas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">InboxChat</span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-4">Empezá gratis</h1>
          <p className="text-sm text-slate-500 mt-1">14 días de trial · Sin tarjeta</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="workspaceName" className="text-sm font-medium text-slate-700">
                Nombre de tu empresa / proyecto
              </label>
              <input
                id="workspaceName"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Ej: Mi Tienda Online"
                required
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">Tu nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@empresa.com"
                required
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-violet-400 transition-colors"
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
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 mt-1 shadow-md shadow-violet-100"
            >
              {isLoading ? "Creando cuenta..." : "Empezar gratis →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-violet-600 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
