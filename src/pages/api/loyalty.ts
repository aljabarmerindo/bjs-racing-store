// File: src/pages/api/loyalty.ts
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

    const { data: points, error } = await supabaseAdmin
      .from("loyalty_points")
      .select("id, points, type, description, created_at, order_id")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const totalPoints = (points || []).reduce((sum, p) => sum + p.points, 0);

    return new Response(JSON.stringify({ totalPoints, points: points || [] }), { status: 200 });
  } catch (error) {
    console.error("Fetch loyalty error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal memuat loyalty points." }),
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
    const { points, type, description, order_id } = body;

    if (!points || !type) {
      return new Response(JSON.stringify({ message: "points dan type wajib diisi." }), {
        status: 400,
      });
    }

    const numericPoints = Number(points);
    const allowedTypes = ["earn", "redeem", "bonus", "admin_adjustment"];
    if (!Number.isInteger(numericPoints) || numericPoints <= 0) {
      return new Response(
        JSON.stringify({ message: "Points harus berupa angka bulat lebih dari 0." }),
        { status: 400 },
      );
    }
    if (!allowedTypes.includes(type)) {
      return new Response(
        JSON.stringify({ message: "Tipe points tidak valid." }),
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

    const { data, error } = await supabaseAdmin
      .from("loyalty_points")
      .insert({
        customer_id: customer.id,
        points: numericPoints,
        type,
        description: description || null,
        order_id: order_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), { status: 201 });
  } catch (error) {
    console.error("Add loyalty error:", error);
    return new Response(
      JSON.stringify({ message: "Gagal menambah loyalty points." }),
      { status: 500 },
    );
  }
};
