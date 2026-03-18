"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, Sparkles, Bell, Key,
  Webhook, Tag, Zap, CreditCard, Globe, Users, MessageCircle,
  ExternalLink, ChevronRight,
} from "lucide-react";

const SERVER_URL =
  process.env["NEXT_PUBLIC_SERVER_URL"] ?? "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ic_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface WorkspaceInfo {
  name: string;
  ownerEmail: string;
  apiKey: string;
  plan: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  isActive: boolean;
  conversationCount: number;
}

const SETTING_SECTIONS = [
  { label: "Widget",         href: "/settings/widget",        Icon: MessageSquare, desc: "Color, título, mensaje de bienvenida, GDPR",       badge: null  },
  { label: "AI Auto-Reply",  href: "/settings/ai",            Icon: Sparkles,      desc: "Contexto, tono y respuestas automáticas Gemini",  badge: "Pro" },
  { label: "Notificaciones", href: "/settings/notifications",  Icon: Bell,          desc: "Email cuando estás offline",                      badge: null  },
  { label: "API & Acceso",   href: "/settings/api",            Icon: Key,           desc: "API key, endpoints y autenticación",              badge: "Pro" },
  { label: "Webhooks",       href: "/settings/webhooks",       Icon: Webhook,       desc: "Integraciones con sistemas externos",             badge: "Pro" },
  { label: "Tags",           href: "/settings/tags",           Icon: Tag,           desc: "Organización de conversaciones",                  badge: null  },
  { label: "Triggers",       href: "/settings/triggers",       Icon: Zap,           desc: "Acciones automáticas",                           badge: null  },
  { label: "Billing",        href: "/settings/billing",        Icon: CreditCard,    desc: "Plan, suscripción y cancelación",                 badge: null  },
];

export default function SettingsGeneralPage() {
  const router = useRouter();
  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${SERVER_URL}/api/billing/status`, { headers: getAuthHeaders() as HeadersInit }),
      fetch(`${SERVER_URL}/api/workspace/me`,   { headers: getAuthHeaders() as HeadersInit }),
    ])
      .then(async ([billingRes, meRes]) => {
        if (billingRes.status === 401 || meRes.status === 401) {
          router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (!billingRes.ok || !meRes.ok) return;

        const [billing, me] = await Promise.all([
          billingRes.json() as Promise<{
            plan: string; trialEndsAt: string | null;
            trialDaysLeft: number | null; isActive: boolean; conversationCount: number;
          }>,
          meRes.json() as Promise<{
            workspace: { name: string; ownerEmail: string; apiKey: string };
          }>,
        ]);
        setInfo({
          name:              me.workspace.name,
          ownerEmail:        me.workspace.ownerEmail,
          apiKey:            me.workspace.apiKey ?? "",
          plan:              billing.plan,
          trialEndsAt:       billing.trialEndsAt,
          trialDaysLeft:     billing.trialDaysLeft,
          isActive:          billing.isActive,
          conversationCount: billing.conversationCount,
        });
      })
      .catch((err) => console.error("[Settings/General]", err))
      .finally(() => setLoading(false));
  }, [router]);

  async function copyApiKey() {
    if (!info?.apiKey) return;
    await navigator.clipboard.writeText(info.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-slate-400 animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Configuración General</h1>
        <p className="text-sm text-slate-500 mt-1">Información de tu workspace</p>
      </div>

      {/* Workspace info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workspace</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500"><Globe className="w-4 h-4" />Nombre</div>
            <span className="text-sm font-medium text-slate-900">{info?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500"><Users className="w-4 h-4" />Email del dueño</div>
            <span className="text-sm font-medium text-slate-900">{info?.ownerEmail ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500"><MessageCircle className="w-4 h-4" />Conversaciones</div>
            <span className="text-sm font-medium text-slate-900">{info?.conversationCount ?? 0}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">Plan</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              info?.isActive ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
            }`}>
              {info?.isActive ? "Pro" : `Trial${info?.trialDaysLeft ? ` · ${info.trialDaysLeft}d restantes` : ""}`}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <Link href="/settings/billing" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Gestionar suscripción <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* API Key */}
      {info?.apiKey && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">API Key</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate">
              {info.apiKey}
            </code>
            <button onClick={() => void copyApiKey()} className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium whitespace-nowrap">
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {/* Secciones */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Secciones</h2>
        <div className="space-y-2">
          {SETTING_SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-200 hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-violet-50 flex items-center justify-center flex-shrink-0 transition-colors">
                <s.Icon className="w-4 h-4 text-slate-500 group-hover:text-violet-500 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                  {s.badge && (
                    <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">{s.badge}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{s.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
