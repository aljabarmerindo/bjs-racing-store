// File: /src/pages/sitemap.xml.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const GET: APIRoute = async () => {
  const { data: posts } = await supabaseAdmin
    .from("feed_posts")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const baseUrl = "https://bjsracing.com";

  const staticUrls = [
    { loc: `${baseUrl}/blog`, lastmod: new Date().toISOString() },
  ];

  const postUrls = (posts || []).map((post) => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastmod: post.updated_at || new Date().toISOString(),
  }));

  const allUrls = [...staticUrls, ...postUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
