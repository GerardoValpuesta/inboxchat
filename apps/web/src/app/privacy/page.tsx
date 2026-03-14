import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad de InboxChat. Cómo recopilamos, usamos y protegemos tus datos.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "14 de marzo de 2025";
const COMPANY = "InboxChat";
const CONTACT_EMAIL = "privacy@inboxchat.app";

export default function PrivacyPage() {
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
          Política de Privacidad
        </h1>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "40px" }}>
          Última actualización: {LAST_UPDATED}
        </p>

        <div style={{ color: "#334155", fontSize: "15px", lineHeight: "1.75", display: "flex", flexDirection: "column", gap: "32px" }}>
          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>1. Información que recopilamos</h2>
            <p>
              {COMPANY} recopila información que vos nos proporcionás directamente al registrarte, incluyendo nombre, dirección de email y contraseña hasheada. También recopilamos datos de los visitantes de tu web que interactúan con el widget de chat (mensajes, nombre y email si lo proveen en el formulario previo al chat).
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>2. Cómo usamos tu información</h2>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li>Proveer y mejorar el servicio de chat en tiempo real.</li>
              <li>Enviarte notificaciones transaccionales (reset de contraseña, invitaciones al equipo).</li>
              <li>Facturación y gestión de suscripciones a través de Stripe.</li>
              <li>Analíticas internas para mejorar la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>3. Almacenamiento de datos</h2>
            <p>
              Los datos se almacenan en bases de datos PostgreSQL hosteadas en infraestructura segura (Supabase/Railway). Los mensajes de chat y datos de contacto de visitantes se retienen mientras la cuenta esté activa. Al cancelar, podés solicitar la eliminación de todos tus datos.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>4. Compartir información con terceros</h2>
            <p>No vendemos ni compartimos tu información personal con terceros, excepto:</p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              <li><strong>Stripe</strong>: procesamiento de pagos.</li>
              <li><strong>Resend</strong>: envío de emails transaccionales.</li>
              <li>Autoridades legales cuando la ley lo requiera.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>5. Cookies y tracking</h2>
            <p>
              {COMPANY} usa cookies de sesión para autenticación. El widget de chat puede usar localStorage para persistir el ID de conversación del visitante entre sesiones. No usamos cookies de terceros para tracking publicitario.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>6. Tus derechos (GDPR)</h2>
            <p>Si estás en la Unión Europea, tenés derecho a:</p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              <li>Acceder a tu información personal.</li>
              <li>Rectificar datos incorrectos.</li>
              <li>Solicitar la eliminación de tus datos ("derecho al olvido").</li>
              <li>Portabilidad de datos.</li>
              <li>Oponerte al procesamiento de tus datos.</li>
            </ul>
            <p style={{ marginTop: "12px" }}>Para ejercer estos derechos, contactanos en <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#7c3aed" }}>{CONTACT_EMAIL}</a>.</p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>7. Seguridad</h2>
            <p>
              Usamos HTTPS en todas las comunicaciones, contraseñas hasheadas con bcrypt, y tokens JWT para autenticación. No almacenamos contraseñas en texto plano.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>8. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política. Te notificaremos por email ante cambios significativos. El uso continuado del servicio después de los cambios implica aceptación.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>9. Contacto</h2>
            <p>
              Si tenés preguntas sobre esta política, escribinos a{" "}
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
          <Link href="/terms" style={{ color: "#94a3b8", textDecoration: "none" }}>Términos de uso</Link>
        </p>
      </footer>
    </div>
  );
}
