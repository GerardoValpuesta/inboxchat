import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos de Uso",
  description: "Términos y condiciones de uso del servicio InboxChat.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "14 de marzo de 2025";
const COMPANY = "InboxChat";
const CONTACT_EMAIL = "legal@inboxchat.app";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #e2e8f0", padding: "0 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a", textDecoration: "none" }}>
            ← InboxChat
          </Link>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Actualizado: {LAST_UPDATED}</span>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
          Términos de Uso
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "40px" }}>
          Última actualización: {LAST_UPDATED}. Al usar {COMPANY}, aceptás estos términos.
        </p>

        <div style={{ color: "#334155", fontSize: "15px", lineHeight: "1.75", display: "flex", flexDirection: "column", gap: "32px" }}>
          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>1. Descripción del servicio</h2>
            <p>
              {COMPANY} es una plataforma SaaS que permite a empresas y desarrolladores agregar un widget de chat en vivo a sus sitios web, gestionando conversaciones con visitantes en tiempo real.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>2. Cuentas y acceso</h2>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li>Debés tener al menos 18 años o usar el servicio bajo supervisión adulta.</li>
              <li>Sos responsable de mantener la seguridad de tu contraseña.</li>
              <li>Cada workspace puede tener múltiples operadores; el dueño de la cuenta es responsable de todos ellos.</li>
              <li>No podés compartir tu cuenta con terceros no autorizados.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>3. Planes y pagos</h2>
            <p>
              {COMPANY} ofrece un período de prueba gratuito de 14 días. Pasado este período, se requiere una suscripción paga para continuar usando el servicio. Los pagos son procesados por Stripe. Los precios pueden cambiar con 30 días de aviso previo.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>4. Uso aceptable</h2>
            <p>Queda prohibido usar {COMPANY} para:</p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              <li>Enviar spam o comunicaciones no deseadas.</li>
              <li>Distribuir malware o contenido malicioso.</li>
              <li>Recopilar datos de usuarios sin su consentimiento.</li>
              <li>Violar leyes locales, nacionales o internacionales.</li>
              <li>Hacer ingeniería inversa o intentar acceder a sistemas no autorizados.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>5. Propiedad intelectual</h2>
            <p>
              El código, diseño e infraestructura de {COMPANY} son propiedad exclusiva de la empresa. El contenido que vos generás (mensajes, configuraciones) es tuyo. Nos otorgás una licencia limitada para procesar ese contenido y proveer el servicio.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>6. Limitación de responsabilidad</h2>
            <p>
              {COMPANY} se provee &quot;tal cual&quot;. No garantizamos disponibilidad del 100% del servicio. No somos responsables por pérdidas de datos, lucro cesante ni daños indirectos derivados del uso o la imposibilidad de uso del servicio.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>7. Cancelación y terminación</h2>
            <p>
              Podés cancelar tu cuenta en cualquier momento desde la sección de billing. {COMPANY} se reserva el derecho de suspender cuentas que violen estos términos. En caso de cancelación, tus datos serán eliminados en un plazo máximo de 30 días.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>8. Modificaciones</h2>
            <p>
              Podemos modificar estos términos. Ante cambios significativos, te notificaremos con al menos 15 días de anticipación. El uso continuado del servicio implica aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>9. Contacto</h2>
            <p>
              Para consultas legales, escribinos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#7c3aed", textDecoration: "underline" }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          <Link href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>InboxChat</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "#94a3b8", textDecoration: "none" }}>Política de Privacidad</Link>
        </p>
      </footer>
    </div>
  );
}
