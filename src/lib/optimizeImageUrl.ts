export function optimizeImageUrl(url: string, width = 600): string {
  if (!url || typeof url !== "string") return url;

  const skipDomains = [
    "drive.google.com",
    "drive.usercontent.google.com",
    "img.youtube.com",
    "i.ytimg.com",
    "a.tile.openstreetmap.org",
    "b.tile.openstreetmap.org",
    "c.tile.openstreetmap.org",
    "tile.openstreetmap.org",
  ];

  const shouldSkip = skipDomains.some((domain) => url.includes(domain));
  if (shouldSkip) return url;

  if (!url.includes("supabase.co/storage/v1/object/public/")) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}w=${width}&q=75`;
}
