import { Loader2 } from "lucide-react";

/**
 * loading.tsx en /settings — Next.js lo muestra automáticamente
 * mientras carga la página de settings (incluye el layout con el sidebar).
 * Da respuesta visual inmediata antes de que lleguen los datos del server.
 */
export default function SettingsLoading() {
  return (
    <div className="flex h-full items-center justify-center min-h-[300px]">
      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
    </div>
  );
}
