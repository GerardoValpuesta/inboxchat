import Link from "next/link";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "InboxChat — Chat en vivo para founders de SaaS",
  description:
    "Intercom cobra $74/mes. InboxChat cuesta $19. Una línea de código. Chat en vivo para los primeros 1000 clientes de tu SaaS. Trial gratuito de 14 días, sin tarjeta.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InboxChat",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Chat en vivo para founders de SaaS. Setup en 2 minutos, $19/mes.",
  url: "https://inboxchat.app",
  offers: {
    "@type": "Offer",
    price: "19",
    priceCurrency: "USD",
    description: "Plan Pro — conversaciones ilimitadas",
  },
};

const S = {
  // Layout
  page: {
    fontFamily: "-apple-system, 'Inter', BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
    background: "#fff",
  },
  container: { maxWidth: "1080px", margin: "0 auto", padding: "0 24px" },
  // Nav
  nav: {
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
    background: "rgba(255,255,255,0.93)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e2e8f0",
  },
  navInner: {
    maxWidth: "1080px",
    margin: "0 auto",
    padding: "0 24px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Buttons
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
    color: "white",
    padding: "13px 26px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: "0 4px 18px rgba(124,58,237,0.35)",
  } as React.CSSProperties,
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    padding: "13px 26px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "15px",
    color: "#374151",
    background: "white",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
};

import type React from "react";

export default function LandingPage() {
  return (
    <div style={S.page}>
      {/* ─── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>InboxChat</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/pricing" style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>Precios</Link>
            <Link href="/login" style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>Iniciar sesión</Link>
            <Link href="/signup" style={{
              fontSize: "14px", fontWeight: 600, color: "white", textDecoration: "none",
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              padding: "8px 18px", borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
            }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg,#faf5ff 0%,#eff6ff 50%,#f0fdf4 100%)",
        padding: "88px 24px 100px", textAlign: "center",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "100px", padding: "4px 14px",
            fontSize: "12px", fontWeight: 600, color: "#7c3aed", marginBottom: "28px",
          }}>
            <span>✨</span>
            <span>Trial gratuito 14 días · Sin tarjeta · 2 min setup</span>
          </div>

          <h1 style={{
            fontSize: "clamp(38px,6vw,62px)", fontWeight: 800, lineHeight: 1.08,
            letterSpacing: "-1.5px", marginBottom: "20px",
          }}>
            El chat en vivo para los{" "}
            <span style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              primeros 1000 clientes
            </span>{" "}
            de tu SaaS
          </h1>

          <p style={{
            fontSize: "19px", color: "#475569", lineHeight: 1.65,
            maxWidth: "540px", margin: "0 auto 16px",
          }}>
            Intercom cobra $74/mes. InboxChat cuesta <strong>$19</strong>.
            Una sola línea de código. Responde a tus usuarios en tiempo real desde el primer día.
          </p>

          {/* Install snippet */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            background: "#1e293b", borderRadius: "10px",
            padding: "10px 16px", marginBottom: "36px",
            fontSize: "13px", fontFamily: "monospace", color: "#94a3b8",
          }}>
            <span style={{ color: "#64748b" }}>{"<script>"}</span>
            <span style={{ color: "#7dd3fc" }}>{"window.InboxChat = { workspaceKey: 'TU_KEY' }"}</span>
            <span style={{ color: "#64748b" }}>{"</script>"}</span>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "60px" }}>
            <Link href="/signup" style={S.btnPrimary}>Empezar gratis →</Link>
            <Link href="/login" style={S.btnSecondary}>Ver demo</Link>
          </div>

          {/* Widget mockup */}
          <div style={{
            background: "white", borderRadius: "20px",
            boxShadow: "0 16px 56px rgba(0,0,0,0.13)", border: "1px solid #e2e8f0",
            overflow: "hidden", maxWidth: "360px", margin: "0 auto",
          }}>
            <div style={{ background: "#1e293b", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "34px", height: "34px", background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "white", fontWeight: 600 }}>S</div>
              <div>
                <div style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>Soporte</div>
                <div style={{ color: "#22c55e", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
                  En línea
                </div>
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "white", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: "13px", color: "#1e293b", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", maxWidth: "80%", alignSelf: "flex-start" }}>
                ¡Hola! 👋 ¿En qué te puedo ayudar?
              </div>
              <div style={{ background: "#1e293b", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", fontSize: "13px", color: "white", maxWidth: "80%", alignSelf: "flex-end" }}>
                ¿Tienen plan para startups?
              </div>
              <div style={{ background: "white", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: "13px", color: "#1e293b", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", maxWidth: "85%", alignSelf: "flex-start" }}>
                ¡Sí! $19/mes, conversaciones ilimitadas, setup en 2 minutos 🚀
              </div>
            </div>
            <div style={{ padding: "12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px", background: "white" }}>
              <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#94a3b8" }}>Escribí tu mensaje...</div>
              <div style={{ width: "36px", height: "36px", background: "#1e293b", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparativa vs Intercom ──────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "12px" }}>
              Intercom para los que ya llegaron. InboxChat para los que están en camino.
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Mismas funciones esenciales. Sin el precio de empresa.</p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#64748b", fontWeight: 600, borderBottom: "2px solid #e2e8f0" }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", color: "#64748b", fontWeight: 600, borderBottom: "2px solid #e2e8f0" }}>Intercom Starter</th>
                  <th style={{ textAlign: "center", padding: "12px 16px", borderBottom: "2px solid #e2e8f0", background: "rgba(124,58,237,0.04)", borderRadius: "8px 8px 0 0" }}>
                    <span style={{ color: "#7c3aed", fontWeight: 700 }}>InboxChat Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Precio mensual", "$74/mes", "$19/mes"],
                  ["Operadores", "1 incluido (+$19 c/u)", "Ilimitados"],
                  ["Setup", "30+ pasos de config", "1 línea de código"],
                  ["Chat en vivo", "✅", "✅"],
                  ["Inbox unificado", "✅", "✅"],
                  ["Asignación de conversaciones", "✅", "✅"],
                  ["Historial del contacto", "✅", "✅"],
                  ["Notas internas", "✅", "✅"],
                  ["Respuestas predefinidas", "✅", "✅"],
                  ["Tags en conversaciones", "✅", "✅"],
                  ["Mensajes proactivos", "✅", "✅"],
                  ["Analytics", "Básico", "✅ Avanzado"],
                  ["API pública", "✅ ($$$)", "✅ Incluida"],
                  ["Widget personalizable", "Limitado", "✅ Color + logo"],
                  ["Contrato anual", "Requerido en planes base", "Sin contrato"],
                  ["Cancela cuando quieras", "❌", "✅"],
                ].map(([feat, intercom, ic], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 16px", color: "#374151", fontWeight: 500 }}>{feat}</td>
                    <td style={{ padding: "11px 16px", textAlign: "center", color: "#94a3b8" }}>{intercom}</td>
                    <td style={{ padding: "11px 16px", textAlign: "center", background: "rgba(124,58,237,0.03)", color: "#7c3aed", fontWeight: 600 }}>{ic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Cómo funciona ────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "12px" }}>Listo en 3 pasos</h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Sin servidores. Sin configuración de 30 pasos.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
            {[
              { num: "01", icon: "📝", title: "Creá tu cuenta", desc: "Registrate en 30 segundos. Sin tarjeta de crédito." },
              { num: "02", icon: "⚡", title: "Pegá 2 líneas de código", desc: "Copiá el snippet de tu dashboard y pegalo en tu <head>." },
              { num: "03", icon: "💬", title: "Respondé desde el inbox", desc: "Tus usuarios te escriben. Vos respondés en tiempo real desde cualquier dispositivo." },
            ].map((step) => (
              <div key={step.num} style={{ background: "white", borderRadius: "16px", padding: "28px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{step.icon}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", letterSpacing: "1px", marginBottom: "8px" }}>PASO {step.num}</div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features grid ────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "12px" }}>
              Todo lo que necesitás para no perder un solo cliente
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {[
              { icon: "⚡", title: "Real-time", desc: "WebSocket nativo. Mensajes en milisegundos, no en seconds." },
              { icon: "🏷️", title: "Tags y filtros", desc: "Categorizá conversaciones por tipo de problema o prioridad." },
              { icon: "🤖", title: "Respuestas rápidas", desc: "Guardá plantillas de respuesta con /atajos." },
              { icon: "👥", title: "Multi-operador", desc: "Asigná conversaciones. Filtros Mías / Sin asignar / Todas." },
              { icon: "🔔", title: "Mensajes proactivos", desc: "Triggeá mensajes automáticos según URL y tiempo en la página." },
              { icon: "📊", title: "Analytics avanzado", desc: "Tasa de resolución, tiempo de respuesta, pico horario." },
              { icon: "📱", title: "100% mobile", desc: "El inbox funciona perfecto en tu celular cuando estás afuera." },
              { icon: "🔑", title: "API pública", desc: "REST API autenticada por API key para integraciones propias." },
            ].map((f) => (
              <div key={f.title} style={{
                background: "#f8fafc", borderRadius: "14px", padding: "22px",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Install snippet ──────────────────────────────────────────────── */}
      <section style={{ padding: "72px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "16px" }}>
            2 líneas. Chat en vivo.
          </h2>
          <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "28px" }}>
            Sin npm install. Sin build steps. Sin configuración de servidores.
          </p>
          <div style={{
            background: "#0f172a", borderRadius: "14px", padding: "24px 28px",
            textAlign: "left", fontSize: "13px", fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            lineHeight: 1.8, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <div style={{ color: "#64748b" }}>{"<!-- Pegá esto en el <head> de tu web -->"}</div>
            <div>
              <span style={{ color: "#7dd3fc" }}>{"<script>"}</span>
            </div>
            <div style={{ paddingLeft: "16px" }}>
              <span style={{ color: "#94a3b8" }}>{"window.InboxChat = {"}</span>
            </div>
            <div style={{ paddingLeft: "32px" }}>
              <span style={{ color: "#fbbf24" }}>{"workspaceKey"}</span>
              <span style={{ color: "#94a3b8" }}>{": "}</span>
              <span style={{ color: "#86efac" }}>{'"tu_workspace_key"'}</span>
            </div>
            <div style={{ paddingLeft: "16px" }}>
              <span style={{ color: "#94a3b8" }}>{"}"}</span>
            </div>
            <div>
              <span style={{ color: "#7dd3fc" }}>{"</script>"}</span>
            </div>
            <div>
              <span style={{ color: "#7dd3fc" }}>{"<script "}</span>
              <span style={{ color: "#fbbf24" }}>{"src"}</span>
              <span style={{ color: "#94a3b8" }}>{"="}</span>
              <span style={{ color: "#86efac" }}>{'"https://server.inboxchat.app/widget.js"'}</span>
              <span style={{ color: "#7dd3fc" }}>{" async></script>"}</span>
            </div>
          </div>
          <Link href="/signup" style={{ ...S.btnPrimary, marginTop: "28px", justifyContent: "center" }}>
            Obtener mi workspace key →
          </Link>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "12px" }}>Precio sin letra chica</h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Sin per-seat pricing. Sin sorpresas en la factura.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Trial */}
            <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", padding: "32px 28px", background: "#f8fafc" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trial Gratuito</div>
              <div style={{ fontSize: "38px", fontWeight: 800, marginBottom: "4px" }}>$0</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>14 días</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Hasta 100 conversaciones", "Widget embeddable", "Inbox en tiempo real", "Sin tarjeta"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: "block", textAlign: "center", padding: "11px",
                borderRadius: "10px", border: "1px solid #cbd5e1",
                color: "#374151", textDecoration: "none", fontWeight: 600, fontSize: "14px", background: "white",
              }}>Empezar gratis</Link>
            </div>
            {/* Pro */}
            <div style={{
              borderRadius: "20px",
              background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
              padding: "32px 28px", position: "relative",
            }}>
              <div style={{
                position: "absolute", top: "14px", right: "14px",
                background: "rgba(255,255,255,0.2)", borderRadius: "100px",
                padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "white",
              }}>Recomendado</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pro</div>
              <div style={{ fontSize: "38px", fontWeight: 800, color: "white", marginBottom: "4px" }}>$19</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>por mes · cancela cuando quieras</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Conversaciones ilimitadas", "Operadores ilimitados", "API pública incluida", "Mensajes proactivos", "Analytics avanzado", "Soporte prioritario"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.9)" }}>
                    <span style={{ color: "#a3e635", fontWeight: 700 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{
                display: "block", textAlign: "center", padding: "11px",
                borderRadius: "10px", background: "white", color: "#7c3aed",
                textDecoration: "none", fontWeight: 700, fontSize: "14px",
              }}>Empezar con Pro $19/mes →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA final ────────────────────────────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
        textAlign: "center",
      }}>
        <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.5px" }}>
          Tu próximo cliente te está esperando
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", marginBottom: "32px" }}>
          14 días gratis · Sin tarjeta · Setup en 2 minutos · Cancela cuando quieras
        </p>
        <Link href="/signup" style={{
          display: "inline-block", background: "white", color: "#7c3aed",
          padding: "14px 32px", borderRadius: "12px", textDecoration: "none",
          fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>Crear cuenta gratis →</Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: "28px 24px", textAlign: "center", borderTop: "1px solid #e2e8f0", background: "white" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          © 2025 InboxChat ·{" "}
          <Link href="/pricing" style={{ color: "#94a3b8", textDecoration: "none" }}>Precios</Link>{" · "}
          <Link href="/privacy" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacidad</Link>{" · "}
          <Link href="/terms" style={{ color: "#94a3b8", textDecoration: "none" }}>Términos</Link>{" · "}
          <Link href="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Login</Link>
        </p>
      </footer>

      <Script id="json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
