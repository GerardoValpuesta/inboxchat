/** @type {import('next').NextConfig} */
const nextConfig = {
  // Importar @inboxchat/shared como parte del build de Next.js
  transpilePackages: ["@inboxchat/shared"],

  experimental: {
    // Forzar componentes de servidor por defecto — optar explícitamente por 'use client'
    // Esto evita enviar código innecesario al browser
  },
};

export default nextConfig;
