import type { Metadata } from "next";
import { InboxLayout } from "@/components/inbox-layout";

export const metadata: Metadata = {
  title: "Inbox — InboxChat",
};

/**
 * Ruta del inbox: /inbox
 *
 * Server Component — puede hacer fetch de datos iniciales.
 * Todo lo que sea interactivo (Socket.io, estado) vive en InboxLayout (Client Component).
 *
 * Por ahora el workspaceId viene hardcodeado para el MVP.
 * En una versión posterior vendrá de la sesión del usuario autenticado.
 */
export default function InboxPage() {
  // TODO: Obtener de la sesión cuando exista auth
  const workspaceId = process.env["DEFAULT_WORKSPACE_ID"] ?? "dev-workspace";

  return <InboxLayout workspaceId={workspaceId} />;
}
