import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing"],
        disallow: ["/inbox", "/settings", "/analytics", "/api/"],
      },
    ],
    sitemap: "https://inboxchat.app/sitemap.xml",
  };
}
