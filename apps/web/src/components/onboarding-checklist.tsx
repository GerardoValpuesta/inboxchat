"use client";

import { useEffect, useState } from "react";
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

const LS_KEY = "ic_onboarding_dismissed";
const STEPS_KEY = "ic_onboarding_steps";

interface OnboardingState {
  widgetInstalled: boolean;
  firstChatReceived: boolean;
  agentInvited: boolean;
}

/**
 * Checklist de onboarding que aparece en el inbox para workspaces nuevos.
 *
 * Se muestra si:
 *   - El workspace tiene menos de 72h de vida (o nunca recibió chats)
 *   - El usuario no lo dismisseó manualmente
 *
 * Se oculta automáticamente cuando los 3 pasos están completos + 3s de delay.
 */
export function OnboardingChecklist({
  conversationCount,
  hasOperators,
  apiKey,
  widgetInstalled: widgetInstalledProp,
  firstChatReceived: firstChatReceivedProp,
  agentInvited: agentInvitedProp,
}: {
  conversationCount: number;
  hasOperators: boolean;
  apiKey: string;
  // Datos reales de workspace_events (opcionales, fallback a inferidos)
  widgetInstalled?: boolean;
  firstChatReceived?: boolean;
  agentInvited?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState<OnboardingState>(() => {
    if (typeof window === "undefined") return { widgetInstalled: false, firstChatReceived: false, agentInvited: false };
    try {
      const saved = localStorage.getItem(STEPS_KEY);
      return saved ? (JSON.parse(saved) as OnboardingState) : { widgetInstalled: false, firstChatReceived: false, agentInvited: false };
    } catch {
      return { widgetInstalled: false, firstChatReceived: false, agentInvited: false };
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // No mostrar si ya fue dismisseado
    if (localStorage.getItem(LS_KEY)) return;

    // Preferir datos reales del servidor; si no están, inferir desde props legacy
    const newSteps: OnboardingState = {
      widgetInstalled: widgetInstalledProp ?? steps.widgetInstalled ?? conversationCount > 0,
      firstChatReceived: firstChatReceivedProp ?? conversationCount > 0,
      agentInvited: agentInvitedProp ?? steps.agentInvited ?? hasOperators,
    };
    localStorage.setItem(STEPS_KEY, JSON.stringify(newSteps));
    setSteps(newSteps);
    setVisible(true);

    // Auto-ocultar si todo está completo
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (newSteps.widgetInstalled && newSteps.firstChatReceived && newSteps.agentInvited) {
      timer = setTimeout(() => {
        localStorage.setItem(LS_KEY, "1");
        setVisible(false);
      }, 3000);
    }
    return () => { if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationCount, hasOperators, widgetInstalledProp, firstChatReceivedProp, agentInvitedProp]);

  function dismiss() {
    localStorage.setItem(LS_KEY, "1");
    setVisible(false);
  }

  function markWidgetInstalled() {
    const updated = { ...steps, widgetInstalled: true };
    localStorage.setItem(STEPS_KEY, JSON.stringify(updated));
    setSteps(updated);
  }

  function copySnippet() {
    const snippet = `<script>
  window.InboxChat = {
    workspaceKey: "${apiKey}",
    serverUrl: "${SERVER_URL}"
  };
</script>
<script src="${SERVER_URL}/widget.js"></script>`;
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      markWidgetInstalled();
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!visible) return null;

  const completedCount = [steps.widgetInstalled, steps.firstChatReceived, steps.agentInvited].filter(Boolean).length;
  const allDone = completedCount === 3;

  const stepList = [
    {
      key: "widget" as const,
      done: steps.widgetInstalled,
      icon: "🔌",
      title: "Instalar el widget",
      description: "Pegá el snippet en tu web para empezar a recibir chats.",
      action: (
        <button
          type="button"
          onClick={copySnippet}
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          {copied ? "✓ Copiado!" : "Copiar snippet →"}
        </button>
      ),
    },
    {
      key: "chat" as const,
      done: steps.firstChatReceived,
      icon: "💬",
      title: "Recibir tu primer chat",
      description: "Abrí el widget en tu web y enviá un mensaje de prueba.",
      action: null,
    },
    {
      key: "agent" as const,
      done: steps.agentInvited,
      icon: "👥",
      title: "Invitar un agente",
      description: "Sumá a un compañero del equipo para responder en conjunto.",
      action: (
        <Link href="/settings" className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
          Ir a Settings →
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-4 mt-4 mb-2 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-violet-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-violet-900">
            {allDone ? "🎉 ¡Listo para producción!" : "Primeros pasos"}
          </span>
          <span className="text-xs bg-violet-100 text-violet-600 font-semibold rounded-full px-2 py-0.5">
            {completedCount}/3
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-violet-100">
        <div
          className="h-1 bg-violet-500 transition-all duration-500"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="divide-y divide-violet-50">
        {stepList.map((step) => (
          <li key={step.key} className="px-4 py-3 flex items-start gap-3">
            {/* Checkmark / círculo */}
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-xs ${
              step.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}>
              {step.done ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[10px]">{step.icon}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${step.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                {step.title}
              </p>
              {!step.done && (
                <>
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  {step.action && <div className="mt-1">{step.action}</div>}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
