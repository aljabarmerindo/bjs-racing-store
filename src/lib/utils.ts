// File: /src/lib/utils.ts

/**
 * Mengonversi string tanggal ISO (dari Supabase) ke format WIB yang mudah dibaca.
 * @param dateString String tanggal dalam format ISO 8601 (e.g., "2025-09-21T05:45:00.123Z")
 * @returns Tanggal dan waktu yang sudah diformat dalam WIB (e.g., "Minggu, 21 September 2025 12.45")
 */
export function formatToWIB(dateString: string | Date): string {
  const date = new Date(dateString);

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta", // Kunci utamanya di sini
    hour12: false, // Gunakan format 24 jam agar lebih jelas
  };

  return new Intl.DateTimeFormat("id-ID", options).format(date);
}

export function nowWIB(): string {
  const now = new Date();
  const wibDate = new Date(now.getTime() + 3600000 * 7);
  return wibDate.toISOString();
}
