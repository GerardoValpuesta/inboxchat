import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "InboxChat — Chat en vivo para tu web",
  description:
    "Agregá chat en vivo a tu web en 2 minutos. Sin servidores, sin configuración. Trial gratuito de 14 días.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ─── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "0 24px",
            height: "60px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>InboxChat</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/login"
              style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: "14px",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                color: "white",
                padding: "8px 18px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
              }}
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #faf5ff 0%, #eff6ff 50%, #f0fdf4 100%)",
          padding: "80px 24px 100px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: "100px",
              padding: "4px 14px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#7c3aed",
              marginBottom: "28px",
            }}
          >
            <span>✨</span>
            <span>Trial gratuito · Sin tarjeta · 2 min setup</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 60px)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#0f172a",
              marginBottom: "20px",
              letterSpacing: "-1px",
            }}
          >
            Chat en vivo para{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              tu web
            </span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#475569",
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "520px",
              margin: "0 auto 40px",
            }}
          >
            Instalá el widget en 2 minutos y empezá a responder conversaciones
            de tus clientes en tiempo real desde tu inbox.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/signup"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                color: "white",
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "15px",
                boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              }}
            >
              Empezar gratis →
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "15px",
                color: "#374151",
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              Ver demo
            </Link>
          </div>

          {/* Widget screenshot mockup */}
          <div
            style={{
              marginTop: "60px",
              background: "white",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              maxWidth: "380px",
              margin: "60px auto 0",
            }}
          >
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
                Hola, quería preguntar sobre los precios
              </div>
              <div style={{ background: "white", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", fontSize: "13px", color: "#1e293b", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", maxWidth: "85%", alignSelf: "flex-start" }}>
                ¡Claro! Tenemos un plan Pro por solo $15/mes con conversaciones ilimitadas.
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

      {/* ─── Cómo funciona ────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginBottom: "12px", letterSpacing: "-0.5px" }}>
              Listo en 3 pasos
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Sin servidores. Sin configuración compleja.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
            {[
              {
                num: "01",
                icon: "📝",
                title: "Creá tu cuenta",
                desc: "Registrate en 30 segundos. Sin tarjeta de crédito.",
              },
              {
                num: "02",
                icon: "⚡",
                title: "Instalá el widget",
                desc: "Copiá 2 líneas de código y pegalo en tu web.",
              },
              {
                num: "03",
                icon: "💬",
                title: "Respondé desde el inbox",
                desc: "Tus clientes te escriben. Vos respondés en tiempo real.",
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  background: "#f8fafc",
                  borderRadius: "16px",
                  padding: "28px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{step.icon}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", letterSpacing: "1px", marginBottom: "8px" }}>
                  PASO {step.num}
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginBottom: "12px", letterSpacing: "-0.5px" }}>
              Todo lo que necesitás
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {[
              { icon: "⚡", title: "Real-time", desc: "Los mensajes llegan instantáneamente vía WebSocket." },
              { icon: "📱", title: "Responsive", desc: "El widget se adapta a mobile y desktop automáticamente." },
              { icon: "🔒", title: "Seguro", desc: "HTTPS + validación del workspace en cada conexión." },
              { icon: "🎨", title: "Embeddable", desc: "Se integra en cualquier web con 2 líneas de HTML." },
              { icon: "📊", title: "Inbox unificado", desc: "Todas las conversaciones en un solo lugar." },
              { icon: "💳", title: "Billing simple", desc: "Plan Pro por $15/mes. Cancelá cuando quieras." },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  background: "white",
                  borderRadius: "14px",
                  padding: "22px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginBottom: "12px", letterSpacing: "-0.5px" }}>
              Precio simple
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px" }}>Sin sorpresas. Sin planes complicados.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Free Trial */}
            <div
              style={{
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
                padding: "32px 28px",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Trial Gratuito
              </div>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>$0</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>14 días</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Hasta 100 conversaciones", "Widget embeddable", "Inbox en tiempo real", "Sin tarjeta"].map(
                  (item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#374151" }}>
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
                      {item}
                    </li>
                  )
                )}
              </ul>
              <Link
                href="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                  background: "white",
                }}
              >
                Empezar gratis
              </Link>
            </div>

            {/* Pro */}
            <div
              style={{
                borderRadius: "20px",
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                padding: "32px 28px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "100px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                Recomendado
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pro
              </div>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "white", marginBottom: "4px" }}>$15</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>por mes</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Conversaciones ilimitadas", "Sin límite de tiempo", "Soporte prioritario", "Actualizaciones incluidas"].map(
                  (item) => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "rgba(255,255,255,0.9)" }}>
                      <span style={{ color: "#a3e635", fontWeight: 700 }}>✓</span>
                      {item}
                    </li>
                  )
                )}
              </ul>
              <Link
                href="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                  borderRadius: "10px",
                  background: "white",
                  color: "#7c3aed",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                Empezar con Pro $15/mes →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA final ────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 24px",
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "32px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.5px" }}>
          Empezá hoy, gratis
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "16px", marginBottom: "32px" }}>
          14 días de trial · Sin tarjeta · Instalación en 2 minutos
        </p>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            background: "white",
            color: "#7c3aed",
            padding: "14px 32px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "15px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          Crear cuenta gratis →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: "24px", textAlign: "center", borderTop: "1px solid #e2e8f0", background: "white" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          © 2025 InboxChat · Todos los derechos reservados ·{" "}
          <Link href="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Login</Link>
        </p>
      </footer>
    </div>
  );
}
