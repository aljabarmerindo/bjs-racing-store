// File: src/pages/api/reviews/eligibility.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url, locals }) => {
  const { session } = locals;
  if (!session) {
    return new Response(JSON.stringify({ eligible: false, message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  const productId = url.searchParams.get("product_id");
  if (!productId) {
    return new Response(JSON.stringify({ eligible: false, message: "product_id wajib diisi." }), {
      status: 400,
    });
  }

  try {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ eligible: false, message: "Profil customer tidak ditemukan." }), {
        status: 404,
      });
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_items(product_id)")
      .eq("customer_id", customer.id)
      .in("status", ["paid", "processing", "shipped", "completed"])
      .limit(50);

    if (error) throw error;

    const eligibleOrder = (orders || []).find((order: any) => {
      const items = order.order_items || [];
      return items.some((item: any) => item.product_id === productId);
    });

    return new Response(
      JSON.stringify({
        eligible: !!eligibleOrder,
        order_id: eligibleOrder?.id || null,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Check review eligibility error:", error);
    return new Response(
      JSON.stringify({ eligible: false, message: "Gagal memeriksa kelayakan ulasan." }),
      { status: 500 },
    );
  }
};
