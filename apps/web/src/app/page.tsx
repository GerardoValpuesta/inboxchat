import { redirect } from "next/navigation";

// La raíz redirige al inbox (en el futuro, aquí iría la lógica de auth)
export default function HomePage() {
  redirect("/inbox");
}
