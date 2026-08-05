// File: src/pages/api/wishlist.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

export const GET: APIRoute = async ({ locals }) => {
  const { session } = locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  try {
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

    const { data: wishlists, error } = await supabaseAdmin
      .from("wishlists")
      .select("id, product_id, created_at, products(*)")
      .eq("customer_id", customer.id)
      .eq("products.status", "Aktif")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(wishlists || []), { status: 200 });
  } catch (error) {
    console.error("Fetch wishlist error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal memuat wishlist." }),
      { status: 500 },
    );
  }
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
    const { product_id } = body;

    if (!product_id) {
      return new Response(JSON.stringify({ message: "product_id wajib diisi." }), {
        status: 400,
      });
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

    const { data, error } = await supabaseAdmin
      .from("wishlists")
      .insert({ customer_id: customer.id, product_id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ message: "Produk sudah ada di wishlist." }), {
          status: 400,
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 201 });
  } catch (error) {
    console.error("Add wishlist error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal menambah wishlist." }),
      { status: 500 },
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const { session } = locals;
  if (!session) {
    return new Response(JSON.stringify({ message: "Tidak diizinkan." }), {
      status: 401,
    });
  }

  try {
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return new Response(JSON.stringify({ message: "product_id wajib diisi." }), {
        status: 400,
      });
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

    const { error } = await supabaseAdmin
      .from("wishlists")
      .delete()
      .eq("customer_id", customer.id)
      .eq("product_id", product_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Remove wishlist error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal menghapus wishlist." }),
      { status: 500 },
    );
  }
};
