// File: /src/lib/voucher.ts
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export interface VoucherValidationResult {
  valid: boolean;
  message?: string;
  discount_amount?: number;
  voucher?: VoucherRow;
  target_label?: string | null;
}

export interface VoucherRow {
  id: string;
  code: string;
  type: "fixed_amount" | "percentage" | "free_shipping";
  discount_value: number;
  max_discount?: number;
  min_purchase?: number;
  is_active?: boolean;
  valid_until?: string;
  usage_limit?: number;
  usage_count?: number;
  target_type?: string;
  target_value?: string[] | null;
  [key: string]: any;
}

// Label human-readable untuk target voucher (keperluan tampilan UI).
export function describeTarget(v: VoucherRow): string | null {
  if (
    !v.target_type ||
    v.target_type === "all_products" ||
    !v.target_value ||
    v.target_value.length === 0
  )
    return null;
  const labels = v.target_value.join(", ");
  if (v.target_type === "category") return `Khusus kategori: ${labels}`;
  if (v.target_type === "brand") return `Khusus merek: ${labels}`;
  if (v.target_type === "specific_product") return `Khusus produk tertentu`;
  return null;
}

// Cek apakah keranjang memenuhi target voucher (kategori/merek/produk).
async function cartMatchesTarget(
  voucher: VoucherRow,
  cartProductIds: string[],
): Promise<boolean> {
  if (
    !voucher.target_type ||
    voucher.target_type === "all_products" ||
    !voucher.target_value ||
    voucher.target_value.length === 0 ||
    !cartProductIds ||
    cartProductIds.length === 0
  )
    return true;

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, kategori, merek")
    .in("id", cartProductIds);

  if (!products || products.length === 0) return false;

  return products.some((p) => {
    if (voucher.target_type === "category")
      return voucher.target_value!.includes(p.kategori);
    if (voucher.target_type === "brand")
      return voucher.target_value!.includes(p.merek);
    if (voucher.target_type === "specific_product")
      return voucher.target_value!.includes(String(p.id));
    return true;
  });
}

// Fungsi tunggal untuk memvalidasi voucher & menghitung diskon.
// Dipakai bersama oleh /api/vouchers/apply (preview) dan
// /api/payment/create-transaction (validasi ulang server-side).
// `cartProductIds` diperlukan untuk memeriksa target voucher bertarget.
export async function validateAndComputeVoucher(
  voucher_code: string,
  customer_id: string,
  cart_subtotal: number,
  shipping_cost: number,
  cartProductIds?: string[],
): Promise<VoucherValidationResult> {
  const { data: voucher, error: voucherError } = await supabaseAdmin
    .from("vouchers")
    .select("*")
    .ilike("code", voucher_code.trim())
    .single();

  if (voucherError || !voucher) {
    return { valid: false, message: "Kode voucher tidak ditemukan." };
  }

  if (!voucher.is_active)
    return { valid: false, message: "Voucher ini sudah tidak aktif." };
  if (new Date(voucher.valid_until) < new Date())
    return { valid: false, message: "Voucher ini sudah kedaluwarsa." };
  if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit)
    return { valid: false, message: "Kuota voucher ini sudah habis." };
  if (cart_subtotal < voucher.min_purchase)
    return {
      valid: false,
      message: `Minimal pembelian untuk voucher ini adalah Rp ${voucher.min_purchase}.`,
    };

  // Cek kepemilikan voucher di "dompet" customer & belum dipakai
  const { data: customerVoucher, error: cvError } = await supabaseAdmin
    .from("customer_vouchers")
    .select("id")
    .eq("customer_id", customer_id)
    .eq("voucher_id", voucher.id)
    .eq("is_used", false)
    .maybeSingle();

  if (cvError || !customerVoucher)
    return {
      valid: false,
      message: "Anda tidak memiliki voucher ini atau sudah digunakan.",
    };

  // Cek kecocokan target (kategori/merek/produk) dengan isi keranjang
  const targetMatched = await cartMatchesTarget(
    voucher as VoucherRow,
    cartProductIds || [],
  );
  if (!targetMatched) {
    const label = describeTarget(voucher as VoucherRow);
    return {
      valid: false,
      message: label
        ? `Voucher ini ${label.toLowerCase()}.`
        : "Voucher ini tidak berlaku untuk item di keranjang Anda.",
    };
  }

  let discount_amount = 0;
  if (voucher.type === "fixed_amount") {
    discount_amount = voucher.discount_value;
  } else if (voucher.type === "percentage") {
    const calculated = cart_subtotal * (voucher.discount_value / 100);
    discount_amount = Math.min(
      calculated,
      voucher.max_discount || calculated,
    );
  } else if (voucher.type === "free_shipping") {
    const current_shipping_cost = Number(shipping_cost) || 0;
    discount_amount = Math.min(current_shipping_cost, voucher.discount_value);
  }

  return {
    valid: true,
    discount_amount: Math.round(discount_amount),
    voucher: voucher as VoucherRow,
    target_label: describeTarget(voucher as VoucherRow),
  };
}

// Tandai voucher sebagai sudah dipakai & naikkan usage_count.
// Dilakukan setelah order berhasil dibuat agar voucher tidak bisa dipakai ulang.
export async function consumeVoucher(
  customer_id: string,
  voucher_id: string,
): Promise<void> {
  await supabaseAdmin
    .from("customer_vouchers")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("customer_id", customer_id)
    .eq("voucher_id", voucher_id)
    .eq("is_used", false);

  const { data: current } = await supabaseAdmin
    .from("vouchers")
    .select("usage_count")
    .eq("id", voucher_id)
    .single();

  if (current) {
    await supabaseAdmin
      .from("vouchers")
      .update({ usage_count: (current.usage_count || 0) + 1 })
      .eq("id", voucher_id);
  }
}

// Kembalikan konsumsi voucher saat order lama dibatalkan/diganti.
export async function unconsumeVoucher(
  customer_id: string,
  voucher_id: string,
): Promise<void> {
  await supabaseAdmin
    .from("customer_vouchers")
    .update({ is_used: false, used_at: null })
    .eq("customer_id", customer_id)
    .eq("voucher_id", voucher_id)
    .eq("is_used", true);

  const { data: current } = await supabaseAdmin
    .from("vouchers")
    .select("usage_count")
    .eq("id", voucher_id)
    .single();

  if (current) {
    await supabaseAdmin
      .from("vouchers")
      .update({ usage_count: Math.max(0, (current.usage_count || 1) - 1) })
      .eq("id", voucher_id);
  }
}
