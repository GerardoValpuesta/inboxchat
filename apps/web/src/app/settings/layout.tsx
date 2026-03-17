"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings",               label: "General",        icon: "⚙️" },
  { href: "/settings/widget",        label: "Widget",         icon: "💬" },
  { href: "/settings/ai",            label: "AI Auto-Reply",  icon: "✨",  badge: "Pro" },
  { href: "/settings/notifications", label: "Notificaciones", icon: "🔔" },
  { href: "/settings/api",           label: "API",            icon: "🔑",  badge: "Pro" },
  { href: "/settings/webhooks",      label: "Webhooks",       icon: "🔗",  badge: "Pro" },
  { href: "/settings/tags",          label: "Tags",           icon: "🏷️" },
  { href: "/settings/triggers",      label: "Triggers",       icon: "⚡" },
  { href: "/settings/billing",       label: "Billing",        icon: "💳" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {/* Sidebar de navegación de settings */}
      <aside className="hidden md:flex flex-col w-52 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="px-4 py-4 border-b border-slate-100">
          <Link
            href="/inbox"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al inbox
          </Link>
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Configuración
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              // Activo exacto para /settings, prefix para el resto
              const isActive =
                item.href === "/settings"
                  ? pathname === "/settings"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-violet-50 text-violet-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
