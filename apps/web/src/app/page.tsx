import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "InboxChat — Chat en vivo para tu SaaS. $29/mes.",
  description:
    "Intercom cobra $74/mes. InboxChat cuesta $29. Una línea de código. Chat en vivo, AI auto-reply, SLA alerts y CSAT. Trial gratuito 14 días, sin tarjeta.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InboxChat",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Chat en vivo para SaaS. Setup en 2 minutos, $29/mes.",
  url: "https://inboxchat.app",
  offers: { "@type": "Offer", price: "29", priceCurrency: "USD" },
};

const BENEFITS = [
  {
    icon: "⚡",
    title: "Online en 2 minutos",
    body: "Pegás 2 líneas de código en tu <head> y tu chat está live. No hay nada que configurar, compilar ni desplegar.",
  },
  {
    icon: "🤖",
    title: "IA responde por vos",
    body: "Gemini Flash contesta a tus usuarios mientras dormís. Vos definís el tono y el contexto del negocio.",
  },
  {
    icon: "⏰",
    title: "Cero conversaciones perdidas",
    body: "Los SLA alerts te disparan un email si un usuario espera más de X minutos. Nunca más pierdes una venta caliente.",
  },
  {
    icon: "📊",
    title: "Analytics que importan",
    body: "Tasa de respuesta, tiempo medio, CSAT y heatmap de actividad. Todo lo que necesitás para mejorar tu soporte.",
  },
  {
    icon: "🌐",
    title: "Funciona en cualquier stack",
    body: "React, Vue, Next.js, WordPress, Webflow. Si corre en un browser, InboxChat funciona ahí.",
  },
  {
    icon: "🔒",
    title: "Tus datos, seguros",
    body: "Row Level Security en Supabase. Webhooks con firma HMAC-SHA256. Nunca compartimos tu data con terceros.",
  },
];

const TESTIMONIALS = [
  {
    quote: "En 15 minutos tenía el widget funcionando en producción. Mis usuarios me escriben y yo respondo desde el inbox en tiempo real.",
    author: "Martín R.",
    role: "Founder, SaaS B2B",
    avatar: "M",
    color: "from-violet-500 to-purple-600",
  },
  {
    quote: "Estaba pagando $74/mes por Intercom y usando el 10% de sus features. InboxChat hace exactamente lo que necesito.",
    author: "Carolina V.",
    role: "CEO, EdTech startup",
    avatar: "C",
    color: "from-cyan-500 to-blue-600",
  },
  {
    quote: "Los SLA alerts me salvan. Si un usuario espera más de 10 minutos me llega un email. Nunca más pierdo una conversación caliente.",
    author: "Diego M.",
    role: "Indie hacker",
    avatar: "D",
    color: "from-emerald-500 to-teal-600",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/ mes",
    desc: "Para validar tu idea",
    features: ["100 conversaciones/mes", "1 operador", "Widget personalizable", "Chat en tiempo real"],
    cta: "Empezar gratis",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ mes",
    desc: "Para founders que escalan",
    badge: "Más popular",
    features: [
      "Conversaciones ilimitadas",
      "5 operadores",
      "AI Auto-Reply (Gemini Flash)",
      "SLA alerts por email",
      "Resumen semanal automático",
      "CSAT & analytics",
      "Webhooks + API REST",
      "Filtros y asignación",
    ],
    cta: "Probar 14 días gratis",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Growth",
    price: "$79",
    period: "/ mes",
    desc: "Para equipos en crecimiento",
    features: [
      "Todo lo de Pro",
      "Operadores ilimitados",
      "2.000 AI replies/mes",
      "Soporte prioritario",
      "Onboarding en vivo",
    ],
    cta: "Contactar ventas",
    href: "mailto:hola@inboxchat.app",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "¿Funciona en cualquier web?",
    a: "Sí. Dos líneas de JavaScript en tu <head>. Funciona en React, Vue, Next.js, WordPress, Webflow o cualquier stack.",
  },
  {
    q: "¿Qué tan difícil es la instalación?",
    a: "Menos de 2 minutos. Copiás tu snippet del dashboard, lo pegás antes del </head> de tu sitio y listo. El widget aparece en todas las páginas automáticamente.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí, sin permanencia ni penalidades. Cancelás desde Settings → Billing con un click. Sin emails de retención.",
  },
  {
    q: "¿Qué pasa al superar los límites del Free?",
    a: "El widget sigue funcionando, el inbox muestra un aviso de upgrade. No se pierden mensajes, nunca.",
  },
  {
    q: "¿Funciona la IA sin que yo esté conectado?",
    a: "Exacto. El AI Auto-Reply corre cada minuto en el servidor. Detecta conversaciones sin respuesta del operador y contesta en tu nombre con el tono y contexto que vos configuraste.",
  },
  {
    q: "¿Hay API para integraciones con Zapier / Make?",
    a: "Sí. El plan Pro incluye la REST API completa con tu API Key y webhooks salientes con firma HMAC-SHA256.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-[15px] tracking-tight">InboxChat</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#beneficios" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">Beneficios</Link>
            <Link href="#precios" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">Precios</Link>
            <Link href="#faq" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">FAQ</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium hidden sm:block">
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-4 py-2 rounded-lg shadow-md shadow-violet-200/50 transition-all hover:shadow-lg hover:shadow-violet-300/50 hover:-translate-y-px"
            >
              Empezar gratis
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-20 pb-28 px-6">
        {/* Background glows */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-semibold text-violet-700">Trial gratuito 14 días · Sin tarjeta · Setup 2 min</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] mb-6 text-slate-900">
            El chat en vivo que{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Intercom nunca fue
            </span>
            <br />para tu SaaS
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Intercom cobra <span className="line-through text-slate-400">$74</span>/mes y te cobra por feature.
            InboxChat es <strong className="text-slate-700">$29/mes</strong>, todo incluido.
            Responde a tus usuarios en tiempo real —{" "}
            <span className="text-slate-700 font-medium">o deja que la IA lo haga por vos.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-violet-300/40 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-400/40"
            >
              Empezar gratis — 14 días
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="#precios"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-base px-6 py-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all"
            >
              Ver precios
            </Link>
          </div>

          {/* Trust bar */}
          <p className="text-xs text-slate-400 font-medium mb-2">Sin tarjeta de crédito · Cancelá cuando quieras</p>

          {/* Code snippet */}
          <div className="inline-flex items-center gap-3 bg-slate-900 rounded-xl px-5 py-3 mt-6">
            <span className="text-slate-500 text-xs font-mono select-none">→</span>
            <code className="text-emerald-400 text-sm font-mono">
              {`<script src="inboxchat.app/widget.js" defer></script>`}
            </code>
            <span className="bg-slate-700 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded">COPY</span>
          </div>
        </div>

        {/* Mock inbox UI */}
        <div className="max-w-5xl mx-auto mt-16 px-4">
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-200 overflow-hidden">
            {/* Window chrome */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
                  inboxchat-web.vercel.app/inbox
                </div>
              </div>
            </div>
            {/* Inbox UI preview */}
            <div className="grid grid-cols-12 h-64 sm:h-80">
              {/* Sidebar */}
              <div className="col-span-4 border-r border-slate-100 bg-slate-50 p-3 space-y-2 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-600">Inbox · 3 nuevos</span>
                </div>
                {[
                  { name: "Ana García", msg: "¿Tienen soporte en español?", time: "1m", unread: true, color: "bg-violet-500" },
                  { name: "Carlos Lima", msg: "El pago no me está pasando", time: "5m", unread: true, color: "bg-blue-500" },
                  { name: "Sofía Ruiz", msg: "Perfecto, muchas gracias!", time: "12m", unread: false, color: "bg-emerald-500" },
                  { name: "Pedro M.", msg: "¿Puedo exportar mis datos?", time: "1h", unread: false, color: "bg-orange-500" },
                ].map((conv) => (
                  <div key={conv.name} className={`flex items-center gap-2.5 p-2 rounded-lg ${conv.unread ? "bg-white shadow-sm border border-slate-200" : ""}`}>
                    <div className={`w-7 h-7 rounded-full ${conv.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                      {conv.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{conv.name}</span>
                        <span className="text-[9px] text-slate-400 flex-shrink-0 ml-1">{conv.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{conv.msg}</p>
                    </div>
                    {conv.unread && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Chat panel */}
              <div className="col-span-8 flex flex-col">
                <div className="border-b border-slate-100 px-4 py-2.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Ana García</p>
                    <p className="text-[10px] text-slate-400">En línea</p>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%]">
                      <p className="text-[11px] text-slate-700">¿Tienen soporte en español?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%]">
                      <p className="text-[11px] text-white">¡Claro que sí! Somos un equipo hispanohablante 🙌</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%]">
                      <p className="text-[11px] text-slate-700">Genial, voy a probarlo hoy mismo</p>
                    </div>
                  </div>
                  {/* Typing preview */}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-violet-200 flex-shrink-0" />
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOGOS / SOCIAL PROOF ─────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-6">Funciona en cualquier stack</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Next.js", "React", "Vue", "Nuxt", "WordPress", "Webflow", "Shopify", "Laravel"].map((tech) => (
              <span key={tech} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFICIOS ───────────────────────────────────────────────────── */}
      <section id="beneficios" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 mb-3 uppercase tracking-widest">Por qué InboxChat</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Todo lo que necesitás.<br />Nada que no necesitás.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              No somos otro Intercom. Somos lo que necesitabas antes de poder pagar Intercom.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: b.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-24 px-6 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-widest">Setup en 3 pasos</p>
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">Online en menos de 5 minutos</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Sin devops, sin configuraciones raras. Si sabés pegar código HTML, podés hacerlo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Registrate",
                desc: "Creás tu cuenta y workspace en menos de 60 segundos. Sin tarjeta de crédito.",
              },
              {
                step: "02",
                title: "Instalá el widget",
                desc: "Copiás el snippet de tu dashboard y lo pegás en el <head> de tu sitio.",
              },
              {
                step: "03",
                title: "Respondé desde el inbox",
                desc: "Tus usuarios ven el chat widget. Vos respondés desde tu inbox en tiempo real.",
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-black text-slate-700 mb-4 font-mono">{s.step}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-xl shadow-violet-900/50"
            >
              Empezar ahora — es gratis
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-violet-600 mb-3 uppercase tracking-widest">Social proof</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Lo que dicen los founders que lo usan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex text-amber-400 mb-4 gap-0.5">
                  {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────────────── */}
      <section id="precios" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-violet-600 mb-3 uppercase tracking-widest">Precios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
              Sin sorpresas. Sin por-asiento.
            </h2>
            <p className="text-slate-500">Precios planos. Todas las features incluidas. Escalá cuando estés listo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 relative ${
                  plan.highlight
                    ? "border-violet-400 bg-gradient-to-b from-violet-50 to-white shadow-xl shadow-violet-200/60 scale-[1.02]"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-violet-300/50">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-400 text-sm mb-1.5">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-500">{plan.desc}</p>
                </div>
                <Link
                  href={plan.href}
                  className={`block text-center font-semibold text-sm py-3 px-6 rounded-xl transition-all mb-6 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-300/40 hover:shadow-lg hover:-translate-y-px"
                      : "border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-violet-500" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Todos los planes tienen 14 días de trial gratuito. Sin tarjeta de crédito.
          </p>
        </div>
      </section>

      {/* ─── CTA INTERMEDIO ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-violet-600 to-indigo-600 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
            Tus usuarios te están escribiendo.
            <br />¿Estás respondiendo?
          </h2>
          <p className="text-violet-200 text-lg mb-8">
            Cada minuto sin responder es una oportunidad perdida. Instalá InboxChat hoy.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold text-base px-8 py-4 rounded-xl shadow-xl hover:bg-violet-50 transition-all hover:-translate-y-0.5"
          >
            Empezar gratis — 14 días
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-violet-300 text-xs mt-4">Sin tarjeta · 2 min setup · Cancelá cuando quieras</p>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-600 mb-3 uppercase tracking-widest">FAQ</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-slate-200 px-6 py-5">
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{item.q}</h3>
                <p
                  className="text-sm text-slate-500 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.a }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="font-bold text-slate-900">InboxChat</span>
              </div>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Chat en vivo para founders de SaaS. Sin bloatware, sin $74/mes.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-4">
              {[
                { label: "Producto", links: [{ name: "Precios", href: "#precios" }, { name: "FAQ", href: "#faq" }, { name: "Changelog", href: "#" }] },
                { label: "Legal", links: [{ name: "Privacy", href: "/privacy" }, { name: "Terms", href: "/terms" }] },
                { label: "Cuenta", links: [{ name: "Login", href: "/login" }, { name: "Registrarse", href: "/signup" }] },
              ].map((col) => (
                <div key={col.label}>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">{col.label}</p>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l.name}>
                        <Link href={l.href} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">{l.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} InboxChat. Hecho con ☕ para founders.</p>
            <p className="text-xs text-slate-400">
              ¿Preguntas?{" "}
              <a href="mailto:hola@inboxchat.app" className="text-violet-600 hover:underline">hola@inboxchat.app</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
