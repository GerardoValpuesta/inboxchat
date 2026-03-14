"use client";

import { useEffect, useState } from "react";
import { InboxLayout } from "@/components/inbox-layout";

/**
 * Página del inbox — lee el workspaceId del JWT en localStorage.
 * El workspaceId se embebe en el JWT al hacer login/register.
 */
export default function InboxPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ic_token");
    if (!token) return;

    try {
      // El JWT tiene 3 partes separadas por punto: header.payload.signature
      // El payload es base64url — lo decodificamos para leer el workspaceId
      const payload = token.split(".")[1];
      if (!payload) return;
      const decoded = JSON.parse(atob(payload)) as { workspaceId?: string };
      setWorkspaceId(decoded.workspaceId ?? null);
    } catch {
      // Token malformado — el middleware de Next.js ya levanta a /login
    }
  }, []);

  if (!workspaceId) {
    // Mientras decodifica el token (< 1ms) mostramos nada
    return null;
  }

  return <InboxLayout workspaceId={workspaceId} />;
}
