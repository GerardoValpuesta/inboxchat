import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Precios · InboxChat",
  description: "Live chat para SaaS. Empieza gratis, escala cuando lo necesites. REST API, webhooks, CSAT y SLA desde $29/mes.",
};

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      style={{ color: "#7c3aed", flexShrink: 0, marginTop: "2px" }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const FREE_FEATURES = [
  "14 días de prueba gratis (Pro)",
  "Hasta 100 conversaciones/mes",
  "1 operador incluido",
  "Widget personalizable",
  "Chat en tiempo real",
  "Historial 30 días",
  "Analytics básico",
];

const PRO_FEATURES = [
  "Conversaciones ilimitadas",
  "Hasta 5 operadores",
  "Todo lo del plan Free",
  "REST API pública (Zapier, Make)",
  "Webhooks salientes",
  "Business hours",
  "CSAT analytics",
  "SLA alerts por email",
  "Historial 1 año",
  "Sin branding InboxChat",
  "Soporte email 24h",
];

const GROWTH_FEATURES = [
  "Conversaciones ilimitadas",
  "Hasta 20 operadores",
  "Todo lo del plan Pro",
  "Rate limits altos en API",
  "Webhooks con retry automático",
  "Historial ilimitado",
  "Soporte chat prioritario 24h",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
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
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
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
          </Link>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link href="/login" style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                padding: "8px 18px",
                borderRadius: "10px",
                textDecoration: "none",
              }}
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "72px 24px 48px", textAlign: "center" }}>
        <p
          style={{
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7c3aed",
            background: "#f3f0ff",
            padding: "4px 12px",
            borderRadius: "100px",
            marginBottom: "16px",
          }}
        >
          Precios
        </p>
        <h1 style={{ fontSize: "40px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>
          Simple y transparente
        </h1>
        <p style={{ fontSize: "18px", color: "#475569", maxWidth: "480px", margin: "0 auto 0" }}>
          Un solo plan. Sin sorpresas. Empezá gratis, pasá a Pro cuando estés listo.
        </p>
      </section>

      {/* Cards */}
      <section
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Trial / Free */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "white",
          }}
        >
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              Trial
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "42px", fontWeight: 800, color: "#0f172a" }}>$0</span>
              <span style={{ fontSize: "16px", color: "#94a3b8" }}> / 14 días</span>
            </div>
            <p style={{ fontSize: "14px", color: "#475569", margin: "8px 0 0" }}>
              Sin tarjeta de crédito. Sin configuración.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {FREE_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#334155" }}>
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px",
              borderRadius: "12px",
              border: "1.5px solid #7c3aed",
              color: "#7c3aed",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              marginTop: "auto",
              transition: "background .15s",
            }}
          >
            Empezar gratis →
          </Link>
        </div>

        {/* Pro */}
        <div
          style={{
            border: "2px solid #7c3aed",
            borderRadius: "20px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "linear-gradient(160deg, #faf5ff 0%, #fff 60%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-12px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 14px",
              borderRadius: "100px",
              whiteSpace: "nowrap",
            }}
          >
            Más popular
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              Pro
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "42px", fontWeight: 800, color: "#0f172a" }}>$29</span>
              <span style={{ fontSize: "16px", color: "#94a3b8" }}>{" "}/ mes</span>
            </div>
            <p style={{ fontSize: "14px", color: "#475569", margin: "8px 0 0" }}>
              Todo sin límites. Un solo pago mensual.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#334155" }}>
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              marginTop: "auto",
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
            }}
          >
            Empezar con Pro →
          </Link>
        </div>

        {/* Growth */}
        <div
          style={{
            border: "1px solid #d1fae5",
            borderRadius: "20px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "linear-gradient(160deg, #f0fdf4 0%, #fff 60%)",
          }}
        >
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              Growth
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "42px", fontWeight: 800, color: "#0f172a" }}>$79</span>
              <span style={{ fontSize: "16px", color: "#94a3b8" }}>{" "}/ mes</span>
            </div>
            <p style={{ fontSize: "14px", color: "#475569", margin: "8px 0 0" }}>
              Para SaaS en pleno crecimiento.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {GROWTH_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "#334155" }}>
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="mailto:hola@inboxchat.app?subject=Plan Growth"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px",
              borderRadius: "12px",
              border: "1.5px solid #059669",
              color: "#059669",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              marginTop: "auto",
            }}
          >
            Hablar con ventas →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "#fafafa", borderTop: "1px solid #e2e8f0", padding: "64px 24px" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", textAlign: "center", marginBottom: "40px" }}>
            Preguntas frecuentes
          </h2>
          {[
            {
              q: "¿Qué pasa cuando termina el trial?",
              a: "Después de los 14 días, podés seguir usando InboxChat con el plan Pro. Si no actualizás, el widget deja de aceptar nuevas conversaciones pero no perdés tus datos.",
            },
            {
              q: "¿Necesito tarjeta de crédito para el trial?",
              a: "No. Solo necesitás un email para crear tu cuenta y empezar a usar el widget.",
            },
            {
              q: "¿Puedo cancelar en cualquier momento?",
              a: "Sí. Sin permanencia, sin penalidades. Cancelás desde Settings → Billing con un click.",
            },
            {
              q: "¿Cuántos dominios puedo cubrir con una cuenta?",
              a: "Una cuenta = un workspace con su propio widget key. Podés usar el mismo key en múltiples páginas dentro del mismo proyecto.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              style={{ borderBottom: "1px solid #e2e8f0", padding: "20px 0" }}
            >
              <p style={{ fontWeight: 600, color: "#0f172a", fontSize: "15px", margin: "0 0 8px" }}>{q}</p>
              <p style={{ color: "#475569", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px" }}>
          ¿Listo para empezar?
        </h2>
        <p style={{ color: "#475569", fontSize: "16px", margin: "0 0 32px" }}>
          14 días gratis. Sin tarjeta. Sin configuración complicada.
        </p>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "white",
            textDecoration: "none",
            padding: "14px 32px",
            borderRadius: "12px",
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
          }}
        >
          Crear cuenta gratis →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          <Link href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>InboxChat</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacidad</Link>
          {" · "}
          <Link href="/terms" style={{ color: "#94a3b8", textDecoration: "none" }}>Términos</Link>
          {" · "}
          <Link href="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Login</Link>
        </p>
      </footer>
    </div>
  );
}
