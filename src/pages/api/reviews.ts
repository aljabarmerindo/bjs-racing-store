// File: src/pages/api/reviews.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ url, locals }) => {
  const { session: _session } = locals;
  const productId = url.searchParams.get("product_id");
  if (!productId) {
    return new Response(JSON.stringify({ message: "product_id wajib diisi." }), {
      status: 400,
    });
  }

  const { data: reviews, error } = await supabaseAdmin
    .from("product_reviews")
    .select("rating, comment, created_at, customers(nama_pelanggan)")
    .eq("product_id", productId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch reviews error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal memuat ulasan." }),
      { status: 500 },
    );
  }

  return new Response(JSON.stringify(reviews || []), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { session } = locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { product_id, order_id, rating, comment } = body;

    if (!product_id || !rating) {
      return new Response(
        JSON.stringify({ message: "product_id dan rating wajib diisi." }),
        { status: 400 },
      );
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return new Response(
        JSON.stringify({ message: "Rating harus berupa angka antara 1 sampai 5." }),
        { status: 400 },
      );
    }

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ message: "Profil customer tidak ditemukan." }), {
        status: 404,
      });
    }

    if (order_id) {
      const { data: existing } = await supabaseAdmin
        .from("product_reviews")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("product_id", product_id)
        .eq("order_id", order_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ message: "Anda sudah mengirim ulasan untuk pesanan ini." }),
          { status: 400 },
        );
      }
    } else {
      const { data: existing } = await supabaseAdmin
        .from("product_reviews")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("product_id", product_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ message: "Anda sudah mengirim ulasan untuk produk ini." }),
          { status: 400 },
        );
      }
    }

    const { data: review, error } = await supabaseAdmin
      .from("product_reviews")
      .insert({
        product_id,
        customer_id: customer.id,
        order_id: order_id || null,
        rating: numericRating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) throw error;

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("rating, jumlah_ulasan")
      .eq("id", product_id)
      .single();

    if (!productError && product) {
      const currentRating = Number(product.rating) || 0;
      const currentCount = Number(product.jumlah_ulasan) || 0;
      const newCount = currentCount + 1;
      const newRating = currentRating + (numericRating - currentRating) / newCount;

      await supabaseAdmin
        .from("products")
        .update({
          rating: Math.round(newRating * 10) / 10,
          jumlah_ulasan: newCount,
        })
        .eq("id", product_id);
    }

    return new Response(JSON.stringify({ success: true, review }), { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return new Response(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Gagal mengirim ulasan.",
      }),
      { status: 500 },
    );
  }
};
