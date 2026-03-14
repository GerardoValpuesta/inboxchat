import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Combina clases de Tailwind de forma segura evitando conflictos.
 * Ejemplo: cn("px-2 py-1", condition && "bg-red-500", "px-4") → "py-1 bg-red-500 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha como "hace X minutos/horas/días" en español.
 */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es,
  });
}

/**
 * Trunca un texto a una longitud máxima con ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Genera las iniciales de un nombre para los avatares.
 * "María García" → "MG", "Visitante" → "V"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
