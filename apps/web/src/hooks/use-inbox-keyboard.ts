"use client";

import { useEffect } from "react";

interface InboxKeyboardOptions {
  onSearch?: () => void;        // ⌘K / Ctrl+K → foco al search
  onEscape?: () => void;        // Esc → cerrar panel activo
  onResolve?: () => void;       // ⌘Enter / Ctrl+Enter → resolver conversación
  onToggleNote?: () => void;    // ⌘Shift+N → toggle modo nota interna
}

/**
 * Hook que registra keyboard shortcuts globales para el inbox.
 * Se activa solo cuando el foco NO está en un input/textarea de un elemento del sistema.
 */
export function useInboxKeyboard({
  onSearch,
  onEscape,
  onResolve,
  onToggleNote,
}: InboxKeyboardOptions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      const meta = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K → search (funciona desde cualquier lugar)
      if (meta && e.key === "k") {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // ⌘Enter / Ctrl+Enter → resolver conversación
      if (meta && e.key === "Enter") {
        e.preventDefault();
        onResolve?.();
        return;
      }

      // ⌘Shift+N → toggle nota interna
      if (meta && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        onToggleNote?.();
        return;
      }

      // Esc → cerrar paneles (solo si no hay un input activo con contenido)
      if (e.key === "Escape" && (!isInput || (isInput && !(e.target as HTMLInputElement).value))) {
        onEscape?.();
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearch, onEscape, onResolve, onToggleNote]);
}
